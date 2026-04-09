import os
import pickle
from datetime import datetime

import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing

from models import Reservation


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACT_DIR = os.path.join(BASE_DIR, 'model_artifacts')
ARTIFACT_PATH = os.path.join(ARTIFACT_DIR, 'holt_winters_model.pkl')
MONTHLY_CSV_FALLBACK = os.path.join(BASE_DIR, 'data_mining', 'EMC_Monthly_Reservations.csv')


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

    # Ensure continuous monthly index for forecasting stability.
    monthly = monthly.asfreq('MS', fill_value=0.0)
    monthly.name = 'reservation_count'
    return monthly


def train_holt_model(monthly_series, trend='add', damped_trend=False):
    """Train Holt-Winters model using all available historical monthly data."""
    model = ExponentialSmoothing(
        monthly_series,
        trend=trend,
        seasonal=None,
        damped_trend=damped_trend,
        initialization_method='estimated',
    )
    fit = model.fit(optimized=True)
    return fit


def save_model_bundle(fit, monthly_series, artifact_path=ARTIFACT_PATH):
    os.makedirs(os.path.dirname(artifact_path), exist_ok=True)

    bundle = {
        'model': fit,
        'metadata': {
            'model_type': 'Holt-Winters (Additive Trend)',
            'trend': 'add',
            'damped_trend': False,
            'trained_at': datetime.utcnow().isoformat() + 'Z',
            'n_observations': int(len(monthly_series)),
            'last_observation_month': monthly_series.index[-1].strftime('%Y-%m'),
        },
    }

    with open(artifact_path, 'wb') as f:
        pickle.dump(bundle, f)

    return bundle['metadata']


def retrain_all_historical_data(include_statuses=None, artifact_path=ARTIFACT_PATH):
    """Train using all historical data and persist model artifact."""
    monthly_series = build_monthly_reservation_series(include_statuses=include_statuses)
    fit = train_holt_model(monthly_series, trend='add', damped_trend=False)
    metadata = save_model_bundle(fit, monthly_series, artifact_path=artifact_path)
    return metadata


if __name__ == '__main__':
    # Lazy import to avoid circular dependency when this module is imported by app routes.
    from app import app

    with app.app_context():
        result = retrain_all_historical_data()
        print('Retraining completed successfully:')
        for key, value in result.items():
            print(f'  {key}: {value}')
