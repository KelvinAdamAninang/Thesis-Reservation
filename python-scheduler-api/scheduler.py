import os
from datetime import datetime
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from data_mining.train_sarimax_model import retrain_all_historical_data as retrain_sarimax
from data_mining.train_sarimax_model import build_monthly_reservation_series

from models import db, Reservation 
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo


# Retrain at semester boundaries (3 times per year):
# - Jan 1 02:00 -> After 2nd Semester (Jan-May)
# - Jun 1 02:00 -> After Summer Period (May-Aug)
# - Sep 1 02:00 -> After 1st Semester (Aug-Dec)
# Minimum training data: 9 months before first retrain is allowed
SEMESTER_RETRAIN_MONTHS = [1, 6, 9]
MIN_TRAINING_MONTHS = 9
SCHEDULER_TIMEZONE = 'Asia/Manila'


def get_next_retrain_at_iso(now=None):
    tz = ZoneInfo(SCHEDULER_TIMEZONE)
    current = now.astimezone(tz) if now else datetime.now(tz)
    candidates = []
    for month in SEMESTER_RETRAIN_MONTHS:
        candidate = datetime(current.year, month, 1, 2, 0, tzinfo=tz)
        if candidate <= current:
            candidate = datetime(current.year + 1, month, 1, 2, 0, tzinfo=tz)
        candidates.append(candidate)
    return min(candidates).isoformat()


def _can_retrain():
    """Check if we have enough training data (>= 9 months) to retrain."""
    try:
        series = build_monthly_reservation_series(
            include_statuses=['approved'],
            allow_csv_fallback=False,
        )
        return len(series) >= MIN_TRAINING_MONTHS, len(series)
    except Exception:
        return False, 0


def _is_reloader_process():
    # Avoid starting duplicate schedulers in Flask debug reload mode.
    flask_debug = os.environ.get('FLASK_DEBUG')
    is_debug = flask_debug in ('1', 'true', 'True')
    if is_debug:
        return os.environ.get('WERKZEUG_RUN_MAIN') == 'true'
    return True


def create_training_scheduler(app):
    scheduler = BackgroundScheduler(timezone=SCHEDULER_TIMEZONE)

    def retrain_job():
        with app.app_context():
            try:
                can_retrain, n_months = _can_retrain()
                if not can_retrain:
                    app.logger.warning(
                        f'Skipping scheduled SARIMAX retrain: only {n_months} months of data (need {MIN_TRAINING_MONTHS})'
                    )
                    return

                metadata = retrain_sarimax(include_statuses=['approved'])
                app.logger.info('Semester SARIMAX retraining completed: %s', metadata)
            except Exception as e:
                app.logger.error(f'Scheduled SARIMAX retraining failed: {str(e)}')

    scheduler.add_job(
        retrain_job,
        CronTrigger(month=','.join(str(m) for m in SEMESTER_RETRAIN_MONTHS), day=1, hour=2, minute=0),
        id='semester_retrain_sarimax',
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    return scheduler


def start_training_scheduler(app):
    if not _is_reloader_process():
        return None

    scheduler = create_training_scheduler(app)
    scheduler.start()
    app.logger.info(
        f'Semester SARIMAX training scheduler started (retrains on months={SEMESTER_RETRAIN_MONTHS}, min data={MIN_TRAINING_MONTHS} months).'
    )
    return scheduler

def auto_cancel_expired_reservations(app):
    """
    Lazy evaluator: Checks for and cancels 'concept-approved' 
    reservations where Stage 2 deadline (5 days from concept approval) has passed.
    
    Matches the logic in app.py _auto_cancel_overdue_stage2_reservations.
    """
    # IMPORT INSIDE THE FUNCTION
    from models import db, Reservation

    with app.app_context():
        try:
            tz = ZoneInfo(SCHEDULER_TIMEZONE)
            now = datetime.now(tz)
            cutoff = now - timedelta(days=5)
            
            # Get all concept-approved reservations without final forms
            candidates = Reservation.query.filter(
                Reservation.status == 'concept-approved',
                Reservation.archived_at == None
            ).all()
            
            auto_denied = 0
            for reservation in candidates:
                # Check if final form already submitted
                has_final_form_link = bool(str(reservation.final_form_url or '').strip())
                has_final_form = bool(reservation.final_form_uploaded or has_final_form_link)
                if has_final_form:
                    continue
                
                # Use concept_approved_at OR date_filed as anchor (same as backend)
                approval_anchor = reservation.concept_approved_at or reservation.date_filed
                if not approval_anchor:
                    continue
                    
                # Make timezone-aware if needed for comparison
                if approval_anchor.tzinfo is None:
                    approval_anchor = approval_anchor.replace(tzinfo=tz)
                
                # Check if deadline passed
                if approval_anchor > cutoff:
                    continue
                
                # Deny the reservation
                reservation.status = 'denied'
                reservation.denial_reason = (
                    'Submission deadline expired. The final form was not submitted '
                    'within 5 days of concept approval. This reservation was '
                    'automatically denied by the system.'
                )
                auto_denied += 1
            
            if auto_denied > 0:
                db.session.commit()
                app.logger.info(
                    f'Lazy evaluation auto-cancelled {auto_denied} expired Stage 2 reservations.'
                )
        except Exception as e:
            db.session.rollback()
            app.logger.error(f'Failed during lazy expiration check: {str(e)}')