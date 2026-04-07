import os
import pickle
from datetime import datetime

import pandas as pd


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACT_PATH = os.path.join(BASE_DIR, 'model_artifacts', 'holt_winters_model.pkl')

SEMESTER_DEFINITIONS = {
    'first_semester': (8, 12),   # Aug-Dec
    'second_semester': (1, 5),   # Jan-May
    'summer_period': (5, 8),     # May-Aug
}


def _month_range(start_date, end_date):
    return pd.date_range(start=start_date, end=end_date, freq='MS')


def _next_period_dates(period_key, now=None):
    if period_key not in SEMESTER_DEFINITIONS:
        raise ValueError(f'Unknown period: {period_key}')

    now = now or datetime.utcnow()
    start_month, end_month = SEMESTER_DEFINITIONS[period_key]

    # Select the next full occurrence of the period.
    year = now.year
    current_month_start = pd.Timestamp(year=now.year, month=now.month, day=1)

    while True:
        start_date = pd.Timestamp(year=year, month=start_month, day=1)
        end_date = pd.Timestamp(year=year, month=end_month, day=1)

        if end_month < start_month:
            end_date = pd.Timestamp(year=year + 1, month=end_month, day=1)

        if start_date >= current_month_start:
            return _month_range(start_date, end_date)

        year += 1


def load_model_bundle(artifact_path=ARTIFACT_PATH):
    if not os.path.exists(artifact_path):
        raise FileNotFoundError(
            'Model artifact not found. Run retraining first to create the model file.'
        )

    with open(artifact_path, 'rb') as f:
        bundle = pickle.load(f)

    if 'model' not in bundle or 'metadata' not in bundle:
        raise ValueError('Invalid model artifact format.')

    return bundle


def _forecast_to_target_months(model_fit, last_observed_month_str, target_months):
    last_observed = pd.Timestamp(last_observed_month_str + '-01')
    target_months = pd.DatetimeIndex(target_months)

    if len(target_months) == 0:
        return pd.Series(dtype='float64')

    max_target = target_months.max()
    months_ahead = (max_target.year - last_observed.year) * 12 + (max_target.month - last_observed.month)
    if months_ahead <= 0:
        raise ValueError('Target months are not in the future relative to training data.')

    forecast_values = model_fit.forecast(months_ahead)
    forecast_index = pd.date_range(
        start=last_observed + pd.offsets.MonthBegin(1),
        periods=months_ahead,
        freq='MS',
    )
    forecast_series = pd.Series(forecast_values, index=forecast_index)
    return forecast_series.reindex(target_months)


def forecast_for_period(period_key, now=None, artifact_path=ARTIFACT_PATH):
    bundle = load_model_bundle(artifact_path=artifact_path)
    model_fit = bundle['model']
    metadata = bundle['metadata']

    target_months = _next_period_dates(period_key, now=now)
    period_forecast = _forecast_to_target_months(
        model_fit,
        metadata['last_observation_month'],
        target_months,
    )

    return {
        'period': period_key,
        'months': [d.strftime('%Y-%m') for d in target_months],
        'predictions': [round(float(v), 2) for v in period_forecast.values],
        'metadata': metadata,
    }


def forecast_all_academic_periods(now=None, artifact_path=ARTIFACT_PATH):
    return {
        key: forecast_for_period(key, now=now, artifact_path=artifact_path)
        for key in SEMESTER_DEFINITIONS.keys()
    }
