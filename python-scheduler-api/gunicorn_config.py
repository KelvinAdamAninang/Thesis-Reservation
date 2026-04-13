# Gunicorn configuration for VacanSee Reservation API
import os
import multiprocessing

# Server socket
bind = f"0.0.0.0:{os.getenv('PORT', 5000)}"
backlog = 2048

# Worker processes
workers = int(os.getenv('GUNICORN_WORKERS', multiprocessing.cpu_count() * 2 + 1))
worker_class = "gthread"  # Use threaded worker for better performance
threads = int(os.getenv('GUNICORN_THREADS', 4))
worker_connections = 1000
timeout = int(os.getenv('GUNICORN_TIMEOUT', 120))
keepalive = 5

# Logging
accesslog = "-"  # Log to stdout
errorlog = "-"   # Log to stderr
loglevel = os.getenv('GUNICORN_LOGLEVEL', 'info')
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Application
max_requests = 1000
max_requests_jitter = 50

# Process naming
proc_name = 'vacansee-api'

# Server mechanics
daemon = False
pidfile = '/tmp/gunicorn.pid'
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL (if needed)
keyfile = None
certfile = None
ca_certs = None

# Server hooks
def on_starting(server):
    print("Gunicorn server is starting...")

def when_ready(server):
    print("Gunicorn server is ready. Spawning workers")

def on_exit(server):
    print("Gunicorn server has exited")
