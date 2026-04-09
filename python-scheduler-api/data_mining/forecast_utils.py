import os
import pickle
from datetime import datetime

import pandas as pd

from data_mining.train_holt_winters_model import build_monthly_reservation_series


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACT_PATH = os.path.join(BASE_DIR, 'model_artifacts', 'holt_winters_model.pkl')

SEMESTER_DEFINITIONS = {
    'first_semester': (8, 12),   # Aug-Dec
    'second_semester': (1, 5),   # Jan-May
    'summer_period': (5, 8),     # May-Aug
}

SEMESTER_LABELS = {
    'first_semester': '1st Semester (Aug-Dec)',
    'second_semester': '2nd Semester (Jan-May)',
    'summer_period': 'Summer Period (May-Aug)',
}


def _month_range(start_date, end_date):
    return pd.date_range(start=start_date, end=end_date, freq='MS')


def _next_period_dates(period_key, now=None, reference_month_start=None):
    if period_key not in SEMESTER_DEFINITIONS:
        raise ValueError(f'Unknown period: {period_key}')

    now = now or datetime.utcnow()
    start_month, end_month = SEMESTER_DEFINITIONS[period_key]

    # Select the next full occurrence of the period.
    year = now.year
    if reference_month_start is not None:
        current_month_start = pd.Timestamp(reference_month_start)
    else:
        current_month_start = pd.Timestamp(year=now.year, month=now.month, day=1)

    while True:
        start_date = pd.Timestamp(year=year, month=start_month, day=1)
        end_date = pd.Timestamp(year=year, month=end_month, day=1)

        if end_month < start_month:
            end_date = pd.Timestamp(year=year + 1, month=end_month, day=1)

        if start_date > current_month_start:
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

    last_observed = pd.Timestamp(metadata['last_observation_month'] + '-01')
    target_months = _next_period_dates(
        period_key,
        now=now,
        reference_month_start=last_observed,
    )
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


def _current_semester_key(now_ts):
    month = now_ts.month
    if 8 <= month <= 12:
        return 'first_semester'
    if 1 <= month <= 4:
        return 'second_semester'
    return 'summer_period'


def _semester_months_for_year(period_key, year):
    start_month, end_month = SEMESTER_DEFINITIONS[period_key]
    start_date = pd.Timestamp(year=year, month=start_month, day=1)
    end_date = pd.Timestamp(year=year, month=end_month, day=1)
    return pd.date_range(start=start_date, end=end_date, freq='MS')


def forecast_current_semester(now=None, artifact_path=ARTIFACT_PATH):
    bundle = load_model_bundle(artifact_path=artifact_path)
    model_fit = bundle['model']
    metadata = bundle['metadata']

    now = now or datetime.utcnow()
    now_month_start = pd.Timestamp(year=now.year, month=now.month, day=1)
    period_key = _current_semester_key(now_month_start)
    semester_months = _semester_months_for_year(period_key, now_month_start.year)

    approved_monthly_actual = build_monthly_reservation_series(include_statuses=['approved'])
    approved_monthly_actual = approved_monthly_actual.reindex(semester_months)

    actual_mask = semester_months < now_month_start
    predicted_months = semester_months[~actual_mask]

    if len(predicted_months) > 0:
        predicted_series = _forecast_to_target_months(
            model_fit,
            metadata['last_observation_month'],
            predicted_months,
        )
    else:
        predicted_series = pd.Series(dtype='float64')

    series = []
    for m in semester_months:
        actual_val = approved_monthly_actual.get(m)
        predicted_val = predicted_series.get(m)
        series.append({
            'month': m.strftime('%Y-%m'),
            'actual': None if pd.isna(actual_val) or m >= now_month_start else round(float(actual_val), 2),
            'predicted': None if pd.isna(predicted_val) else round(max(0.0, float(predicted_val)), 2),
        })

    return {
        'period': period_key,
        'period_label': SEMESTER_LABELS[period_key],
        'months': [m.strftime('%Y-%m') for m in semester_months],
        'series': series,
        'actual_cutoff_month': now_month_start.strftime('%Y-%m'),
        'metadata': metadata,
    }
