import os
import pickle
from datetime import datetime, timedelta, timezone

import pandas as pd
import numpy as np
import calendar
from statsmodels.tsa.statespace.sarimax import SARIMAX

from models import Reservation


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACT_DIR = os.path.join(BASE_DIR, 'model_artifacts')
ARTIFACT_PATH = os.path.join(ARTIFACT_DIR, 'sarimax_model.pkl')
MONTHLY_CSV_FALLBACK = os.path.join(BASE_DIR, 'data_mining', 'EMC_Monthly_Reservations_Cleaned.csv')


def build_features(index):
    """
    Build semester-aware calendar features for each month.

    Semester calendar (Philippine university):
      1st Semester : Aug – Dec  (5 months)
      2nd Semester : Jan – May  (5 months)
      Summer       : Jun – Jul  (2 months)

    Exam schedule: every 5 weeks (1st and 2nd semester ONLY)
      Month 2 of 1st/2nd sem   = midterm exam month
      Month 4-5 of 1st/2nd sem = finals exam months
      Summer semester (Jun-Jul) has NO exams
    """
    rows = []
    for date in index:
        m, y = date.month, date.year

        if m in [8, 9, 10, 11, 12]:
            sem_num = 1
            month_in_sem = m - 7       # Aug=1, Sep=2, Oct=3, Nov=4, Dec=5
        elif m in [1, 2, 3, 4, 5]:
            sem_num = 2
            month_in_sem = m           # Jan=1, Feb=2, Mar=3, Apr=4, May=5
        else:
            sem_num = 3
            month_in_sem = m - 5       # Jun=1, Jul=2

        # No exams during summer semester
        is_exam   = 1 if (sem_num in [1, 2] and month_in_sem == 2) else 0
        is_finals = 1 if (sem_num in [1, 2] and month_in_sem >= 4) else 0
        is_start  = 1 if month_in_sem == 1 else 0
        is_summer = 1 if sem_num == 3 else 0

        _, dim = calendar.monthrange(y, m)
        wdays  = sum(1 for d in range(1, dim + 1)
                     if pd.Timestamp(y, m, d).weekday() < 5)

        rows.append({
            'month_in_sem' : month_in_sem,
            'is_exam'      : is_exam,
            'is_finals'    : is_finals,
            'is_sem_start' : is_start,
            'is_summer'    : is_summer,
            'working_days' : wdays,
        })
    return pd.DataFrame(rows, index=index)


def _load_monthly_series_from_csv(csv_path=MONTHLY_CSV_FALLBACK):
    if not os.path.exists(csv_path):
        raise ValueError('No reservation data in DB and fallback monthly CSV not found.')

    df = pd.read_csv(csv_path)
    if 'month' not in df.columns or 'reservation_count' not in df.columns:
        raise ValueError('Fallback monthly CSV must contain month and reservation_count columns.')

    df['month'] = pd.to_datetime(df['month'])
    df = df.sort_values('month')
    series = pd.Series(df['reservation_count'].astype(float).values, index=df['month'])
    series = series.asfreq('MS', fill_value=0.0)
    series.name = 'reservation_count'
    return series


def build_monthly_reservation_series(include_statuses=None, allow_csv_fallback=True):
    """Aggregate reservation counts into a monthly time series."""
    query = Reservation.query
    if include_statuses:
        query = query.filter(Reservation.status.in_(include_statuses))
    query = query.filter(Reservation.start_time <= datetime.now(timezone.utc))

    rows = query.with_entities(Reservation.start_time).all()
    timestamps = [row[0] for row in rows if row[0] is not None]
    if not timestamps:
        if allow_csv_fallback:
            return _load_monthly_series_from_csv()
        raise ValueError('No reservation data found in database for retraining.')

    series = pd.Series(1, index=pd.to_datetime(timestamps), dtype='int64')
    monthly = series.resample('MS').sum().astype(float)
    monthly = monthly.asfreq('MS', fill_value=0.0)
    monthly.name = 'reservation_count'
    return monthly


def get_sarimax_parameters(series):
    """
    Determine SARIMAX parameters based on data length.
    
    - With < 36 months: use (2,1,1)x(0,0,1,6)  — 6-month seasonality
    - With >= 36 months: use (2,1,1)x(0,0,1,12) — 12-month seasonality
    
    This allows the model to capture annual patterns once enough data is available.
    """
    order = (2, 1, 1)
    
    if len(series) >= 36:
        # 36+ months available: switch to 12-month seasonality for annual patterns
        seasonal_order = (0, 0, 1, 12)
    else:
        # < 36 months: use 6-month seasonality (semester cycle)
        seasonal_order = (0, 0, 1, 6)
    
    return order, seasonal_order


def train_sarimax_model(series):
    """Train SARIMAX with fixed parameters (2,1,1)x(0,0,1,6/12) on full series."""
    order, seasonal_order = get_sarimax_parameters(series)

    exog = build_features(series.index)
    model = SARIMAX(
        series,
        exog=exog,
        order=order,
        seasonal_order=seasonal_order,
        enforce_stationarity=False,
        enforce_invertibility=False
    ).fit(disp=False)

    return model, order, seasonal_order


def save_sarimax_bundle(model, series, order, seasonal_order, artifact_path=ARTIFACT_PATH):
    """Save SARIMAX model and metadata to pickle file."""
    os.makedirs(os.path.dirname(artifact_path), exist_ok=True)

    bundle = {
        'model': model,
        'metadata': {
            'model_type': 'SARIMAX with Semester Features',
            'order': order,
            'seasonal_order': seasonal_order,
            'trained_at': datetime.utcnow().isoformat() + 'Z',
            'n_observations': int(len(series)),
            'last_observation_month': series.index[-1].strftime('%Y-%m'),
        },
    }

    with open(artifact_path, 'wb') as f:
        pickle.dump(bundle, f)

    return bundle['metadata']


def retrain_all_historical_data(include_statuses=None, artifact_path=ARTIFACT_PATH):
    """Train SARIMAX using all historical data and persist model artifact."""
    # Retraining must use live DB data only (no CSV fallback).
    series = build_monthly_reservation_series(
        include_statuses=include_statuses,
        allow_csv_fallback=False,
    )
    model, order, seasonal_order = train_sarimax_model(series)
    metadata = save_sarimax_bundle(model, series, order, seasonal_order, artifact_path=artifact_path)
    return metadata


if __name__ == '__main__':
    from app import app

    with app.app_context():
        result = retrain_all_historical_data(include_statuses=['approved'])
        print('SARIMAX Retraining completed successfully:')
        for key, value in result.items():
            print(f'  {key}: {value}')
