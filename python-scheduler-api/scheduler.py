import os

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from data_mining.train_holt_winters_model import retrain_all_historical_data


# Retrain at semester boundaries:
# - Jan 1 02:00 -> second semester
# - May 1 02:00 -> summer period
# - Aug 1 02:00 -> first semester
SEMESTER_RETRAIN_MONTHS = [1, 5, 8]


def _is_reloader_process():
    # Avoid starting duplicate schedulers in Flask debug reload mode.
    return os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not os.environ.get('FLASK_DEBUG')


def create_training_scheduler(app):
    scheduler = BackgroundScheduler(timezone='Asia/Manila')

    def retrain_job():
        with app.app_context():
            metadata = retrain_all_historical_data()
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
