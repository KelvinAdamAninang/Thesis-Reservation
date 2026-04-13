#!/bin/bash
# VacanSee Reservation API Startup Script using Gunicorn

cd python-scheduler-api

# Export environment variables
export DEBUG=${DEBUG:-False}
export FLASK_ENV=${FLASK_ENV:-production}

# Set number of workers (default: CPU count * 2 + 1)
WORKERS=${GUNICORN_WORKERS:-$(python -c "import multiprocessing; print(multiprocessing.cpu_count() * 2 + 1)")}

# Set port (default: 5000)
PORT=${PORT:-5000}

echo "Starting VacanSee Reservation API..."
echo "  Bind: 0.0.0.0:$PORT"
echo "  Workers: $WORKERS"
echo "  Environment: $FLASK_ENV"

# Start gunicorn with config file
gunicorn --config gunicorn_config.py app:app
