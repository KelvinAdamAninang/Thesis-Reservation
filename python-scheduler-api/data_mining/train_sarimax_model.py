import os
import pickle
from datetime import datetime, timedelta

import pandas as pd
import numpy as np
import calendar
from itertools import product as iproduct
from statsmodels.tsa.statespace.sarimax import SARIMAX
from sklearn.metrics import mean_absolute_error, mean_squared_error

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


def build_monthly_reservation_series(include_statuses=None):
    """Aggregate reservation counts into a monthly time series."""
    query = Reservation.query
    if include_statuses:
        query = query.filter(Reservation.status.in_(include_statuses))
    query = query.filter(Reservation.start_time <= datetime.utcnow())

    rows = query.with_entities(Reservation.start_time).all()
    timestamps = [row[0] for row in rows if row[0] is not None]
    if not timestamps:
        return _load_monthly_series_from_csv()

    series = pd.Series(1, index=pd.to_datetime(timestamps), dtype='int64')
    monthly = series.resample('MS').sum().astype(float)
    monthly = monthly.asfreq('MS', fill_value=0.0)
    monthly.name = 'reservation_count'
    return monthly


def find_best_sarimax(series, max_seconds=120):
    """
    Auto-ARIMA grid search for best SARIMAX parameters.
    Tests combinations of (p,d,q) and (P,D,Q,6).
    Returns best parameters by CV MAE.
    """
    TEST_SIZE = 4
    MIN_TRAIN = 9  # Minimum training months required

    if len(series) < MIN_TRAIN + TEST_SIZE:
        raise ValueError(f'Series has {len(series)} months, need at least {MIN_TRAIN + TEST_SIZE}')

    train_y = series.iloc[:-TEST_SIZE]
    test_y = series.iloc[-TEST_SIZE:]
    actual = test_y.values.astype(float)

    exog = build_features(series.index)
    train_x = exog.iloc[:-TEST_SIZE]
    test_x = exog.iloc[-TEST_SIZE:]

    candidates = []
    import time
    start_time = time.time()

    for p, d, q in iproduct([0, 1, 2], [0, 1], [0, 1, 2]):
        if time.time() - start_time > max_seconds:
            break

        for P, D, Q in iproduct([0, 1], [0, 1], [0, 1]):
            try:
                m = SARIMAX(
                    train_y,
                    exog=train_x,
                    order=(p, d, q),
                    seasonal_order=(P, D, Q, 6),
                    enforce_stationarity=False,
                    enforce_invertibility=False
                ).fit(disp=False)

                fc = m.forecast(TEST_SIZE, exog=test_x).values
                if np.any(np.isnan(fc)) or np.any(np.isinf(fc)):
                    continue
                if np.any(fc < 0):
                    fc = np.maximum(fc, 0)

                flat = len(set(round(v, 1) for v in fc)) == 1
                if flat:
                    continue

                mae = mean_absolute_error(actual, fc)
                rmse = np.sqrt(mean_squared_error(actual, fc))

                candidates.append({
                    'order': (p, d, q),
                    'seasonal': (P, D, Q, 6),
                    'mae': mae,
                    'rmse': rmse,
                    'aic': m.aic,
                })
            except Exception:
                pass

    if not candidates:
        raise ValueError('No valid SARIMAX models found in grid search')

    candidates.sort(key=lambda x: x['mae'])
    best = candidates[0]
    return best['order'], best['seasonal']


def train_sarimax_model(series):
    """Train SARIMAX with features on full series."""
    order, seasonal_order = find_best_sarimax(series)

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
    series = build_monthly_reservation_series(include_statuses=include_statuses)
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
