import os
from datetime import datetime
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from data_mining.train_holt_winters_model import retrain_all_historical_data


# Retrain at semester boundaries:
# - Jan 1 02:00 -> second semester
# - May 1 02:00 -> summer period
# - Aug 1 02:00 -> first semester
SEMESTER_RETRAIN_MONTHS = [1, 5, 8]
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


def _is_reloader_process():
    # Avoid starting duplicate schedulers in Flask debug reload mode.
    return os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not os.environ.get('FLASK_DEBUG')


def create_training_scheduler(app):
    scheduler = BackgroundScheduler(timezone=SCHEDULER_TIMEZONE)

    def retrain_job():
        with app.app_context():
            metadata = retrain_all_historical_data(include_statuses=['approved'])
            app.logger.info('Semester retraining completed: %s', metadata)

    scheduler.add_job(
        retrain_job,
        CronTrigger(month=','.join(str(m) for m in SEMESTER_RETRAIN_MONTHS), day=1, hour=2, minute=0),
        id='semester_retrain_holt',
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
    app.logger.info('Semester training scheduler started (months=%s).', SEMESTER_RETRAIN_MONTHS)
    return scheduler
