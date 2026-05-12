import io
import pandas as pd
import os
import json
import uuid
from urllib.parse import urlparse
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, send_from_directory, session, send_file
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_cors import CORS
from datetime import datetime, date, time, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from io import BytesIO
from sqlalchemy import inspect
from sqlalchemy import or_, case
from sqlalchemy.orm import joinedload
from dotenv import load_dotenv
import boto3
from botocore.exceptions import ClientError

from models import db, User, Room, Reservation, Holiday 
from data_mining.analytics import build_analytics_snapshot
from data_mining.analytics import generate_monthly_report
from data_mining.forecast_utils import forecast_all_academic_periods, forecast_for_period, forecast_current_semester
from data_mining.train_sarimax_model import retrain_all_historical_data
from scheduler import start_training_scheduler, get_next_retrain_at_iso, auto_cancel_expired_reservations

try:
    from google import genai as google_genai_client
    from google.genai import types as google_genai_types
    HAS_GOOGLE_GENAI = True
except Exception:
    google_genai_client = None
    google_genai_types = None
    HAS_GOOGLE_GENAI = False
    try:
        import google.generativeai as google_legacy_genai
    except Exception:
        google_legacy_genai = None

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DOTENV_PATH = os.path.join(APP_DIR, '.env')
# Load environment variables from your .env file
load_dotenv(dotenv_path=DOTENV_PATH, override=True)

app = Flask(__name__)


# Enable CORS
allowed_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:5000').split(',')
CORS(app, supports_credentials=True, origins=allowed_origins)

# CONFIG
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

# Session Configuration for persistent login across browser tabs
app.config['SESSION_COOKIE_SECURE'] = True  # Only send over HTTPS in production
app.config['SESSION_COOKIE_HTTPONLY'] = True  # Prevent JavaScript access to session cookie
app.config['SESSION_COOKIE_SAMESITE'] = 'None' 
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)  # Session lasts 7 days
app.config['SESSION_REFRESH_EACH_REQUEST'] = True  # Refresh session on each request


# Grab the Supabase URL from the environment
db_url = os.getenv("DATABASE_URL")

# Fix the SQLAlchemy URI quirk (changes postgres:// to postgresql://)
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

if db_url:
    parsed = urlparse(db_url)
    host = (parsed.hostname or "").lower()
    is_expected_supabase_host = (
        host == "supabase.co" or 
        host.endswith(".supabase.co") or 
        host.endswith(".pooler.supabase.com")  # Support Supabase connection pooling
    )
    looks_like_supabase_host = "supabase" in host
    # Guard against malformed Supabase hostnames without rejecting non-Supabase/local database hosts.
    if looks_like_supabase_host and not is_expected_supabase_host:
        raise RuntimeError(
            "Invalid DATABASE_URL host detected. Supabase hosts must be 'supabase.co', end with '.supabase.co', or end with '.pooler.supabase.com'."
        )

# Configure SQLAlchemy to use Supabase
app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# Initialize S3 client for Supabase Storage
S3_ENDPOINT = os.getenv("S3_ENDPOINT", "").strip()
S3_ACCESS_KEY = os.getenv("Access_Key_ID", "").strip()
S3_SECRET_KEY = os.getenv("Secret_Access_Key", "").strip()
S3_BUCKET = os.getenv("S3_BUCKET", "image_loc")
s3_client = None

if S3_ENDPOINT and S3_ACCESS_KEY and S3_SECRET_KEY:
    try:
        s3_client = boto3.client(
            's3',
            endpoint_url=S3_ENDPOINT,
            aws_access_key_id=S3_ACCESS_KEY,
            aws_secret_access_key=S3_SECRET_KEY,
            region_name='us-east-1'
        )
        app.logger.info("S3 client initialized successfully for Supabase Storage")
    except Exception as e:
        app.logger.error(f"Failed to initialize S3 client: {e}")
        s3_client = None
else:
    app.logger.warning("S3 credentials not fully configured - image storage will be disabled")

# Define your strict rules (The System Prompt)
SYSTEM_PROMPT = """
ROLE:
You are VacanSee, the official Campus Event Space Reservation Assistant. You are a dedicated system component, not a general AI.

STRICT CONSTRAINTS:
1. NO EXTERNAL KNOWLEDGE: Do not answer questions about history, math, coding, or general topics. 
2. NO API/TRIAL MENTION: Never mention you are a \"language model,\" \"free trial,\" or \"AI.\" You are the VacanSee System.
3. REFUSAL PHRASE: If a user asks an unrelated question, you must say: \"I am only programmed to assist with campus facility reservations. Please ask me about room availability or the reservation process.\"

KNOWLEDGE BASE & REPLIES:

- AVAILABLE SPACES:
    If asked \"What are the available spaces?\" or similar, you MUST reply: 
    \"You can view all available spaces for this week directly on the VacanSee Calendar page. I cannot check real-time availability today, but the calendar is always up-to-date for the current week.\"


- STEPS FOR BOOKING:
    If asked about the reservation process, you MUST reply in this exact format (each step on its own line, not as a sentence):
    Step 1: Obtain a Concept Paper (see coordinator).
    Step 2: Upload Concept Paper for EMC Initial Approval.
    Step 3: Once approved, download and print the reservation form.
    Step 4: Collect all required physical signatures.
    Step 5: Upload the fully signed form back to VacanSee.
    Step 6: Wait for Final EMC Approval/Decline.

- CONCEPT PAPER DETAILS:
    If asked \"How do I get a concept paper?\" or \"What is in a concept paper?\", you MUST reply:
    \"You must first speak with the facility coordinator responsible for the venue you want to reserve. The coordinator will explain the specific details required for your concept paper. Once drafted, it must be signed by the Chancellor before it can be uploaded to VacanSee for review.\"

TONE: Professional, Concise, and System-Oriented.

END OF SYSTEM INSTRUCTION.
"""

# Simple cache to prevent duplicate Gemini requests (reduces quota exhaustion)
_gemini_request_cache = {}  # {hash: (timestamp, response)}
_CACHE_TTL_SECONDS = 300  # 5 minutes

def _cache_gemini_request(prompt_hash, response):
    """Cache a Gemini response"""
    _gemini_request_cache[prompt_hash] = (datetime.now(), response)

def _get_cached_gemini_response(prompt_hash):
    """Get cached response if still valid"""
    if prompt_hash not in _gemini_request_cache:
        return None
    cached_time, cached_response = _gemini_request_cache[prompt_hash]
    if (datetime.now() - cached_time).total_seconds() > _CACHE_TTL_SECONDS:
        del _gemini_request_cache[prompt_hash]
        return None
    return cached_response

def _get_gemini_client():
    api_key = str(os.getenv("GEMINI_API_KEY", "")).strip()
    if not api_key:
        return None
    if HAS_GOOGLE_GENAI and google_genai_client is not None:
        return google_genai_client.Client(api_key=api_key)
    if google_legacy_genai is not None:
        google_legacy_genai.configure(api_key=api_key)
        return "legacy-sdk"
    return None

# Initialize extensions
db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
training_scheduler = None
stage2_deadline_scheduler = None

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


def _display_username(user):
    if not user:
        return 'Unknown'
    if user.username == 'deleted_account':
        return 'Deleted Account'
    return user.username


def _get_manual_holiday_on_date(day_value):
    holiday = Holiday.query.filter_by(holiday_date=day_value).first()
    return holiday


def _get_manual_holiday_in_range(start_date, end_date):
    return Holiday.query.filter(
        Holiday.holiday_date >= start_date,
        Holiday.holiday_date <= end_date
    ).order_by(Holiday.holiday_date.asc()).first()


def _build_manual_holiday_events(from_date=None):
    query = Holiday.query
    if from_date is not None:
        query = query.filter(Holiday.holiday_date >= from_date)

    holidays = query.order_by(Holiday.holiday_date.asc(), Holiday.id.asc()).all()
    events = []
    for h in holidays:
        start_dt = datetime.combine(h.holiday_date, datetime.min.time())
        end_dt = datetime.combine(h.holiday_date, datetime.max.time().replace(microsecond=0))
        events.append({
            'id': f'holiday-{h.id}',
            'holiday_id': h.id,
            'room_id': None,
            'room_name': 'University-wide',
            'activity_purpose': f'{h.title} (No Classes)',
            'person_in_charge': 'Admin',
            'start_time': start_dt.isoformat(),
            'end_time': end_dt.isoformat(),
            'department': 'Academic Calendar',
            'event_type': 'holiday',
            'is_holiday': True,
            'holiday_name': h.title,
            'notes': h.notes or '',
        })
    return events

# Create tables (disabled - tables already exist in production Supabase)
# Uncomment if deploying to a new database that has no tables yet
# with app.app_context():
#     try:
#         db.create_all()
#         app.logger.info("Database tables created/verified successfully")
#     except Exception as e:
#         app.logger.warning(f"Could not create database tables on startup: {e}")


def _ensure_room_columns():
    """Backfill new room columns for existing SQLite databases without migrations."""
    inspector = inspect(db.engine)
    columns = {c['name'] for c in inspector.get_columns('rooms')}

    with db.engine.begin() as conn:
        if 'detailed_info' not in columns:
            conn.exec_driver_sql("ALTER TABLE rooms ADD COLUMN detailed_info TEXT")
        if 'image_url' not in columns:
            conn.exec_driver_sql("ALTER TABLE rooms ADD COLUMN image_url VARCHAR(500)")
        if 'position' not in columns:
            conn.exec_driver_sql("ALTER TABLE rooms ADD COLUMN position INTEGER")
            conn.exec_driver_sql("UPDATE rooms SET position = id WHERE position IS NULL")


def _room_ordering():
    return [
        case((Room.position.is_(None), 1), else_=0),
        Room.position.asc(),
        Room.name.asc()
    ]


def _ensure_reservation_columns():
    """Backfill reservation stage-tracking columns for existing databases without migrations."""
    inspector = inspect(db.engine)
    columns = {c['name'] for c in inspector.get_columns('reservations')}

    with db.engine.begin() as conn:
        if 'concept_approved_at' not in columns:
            conn.exec_driver_sql("ALTER TABLE reservations ADD COLUMN concept_approved_at TIMESTAMP")
        if 'department_temp' not in columns:
            conn.exec_driver_sql("ALTER TABLE reservations ADD COLUMN department_temp VARCHAR(200)")


with app.app_context():
    try:
        _ensure_room_columns()
        _ensure_reservation_columns()
        app.logger.info("Database schema verification completed")
    except Exception as e:
        app.logger.warning(f"Could not verify database schema on startup: {e}")
        app.logger.warning("Schema checks will be attempted again on first database access")




def _parse_report_month_year(req_year, req_month):
    now = datetime.now()
    try:
        year = int(req_year or now.year)
        month = int(req_month or now.month)
        if month < 1 or month > 12:
            raise ValueError('month out of range')
        return year, month
    except Exception:
        raise ValueError('Invalid month/year. Month must be 1-12 and year must be numeric.')


@app.route('/api/data-mining/reports/monthly', methods=['GET'])
@login_required
def get_monthly_report():
    if current_user.role not in ['admin', 'admin_phase1']:
        return jsonify({'error': 'Admin access required'}), 403

    try:
        year, month = _parse_report_month_year(request.args.get('year'), request.args.get('month'))
        report_text, report_data = generate_monthly_report(year=year, month=month, logger=app.logger)
        # For compatibility, wrap in a payload similar to the old one
        payload = {
            'month': month,
            'year': year,
            'items': report_data,
            'report_text': report_text,
            'generated_at': datetime.now().isoformat(),
            'total_approved_reservations': len(report_data)
        }
        return jsonify({'status': 'success', 'data': payload})
    except Exception as e:
        app.logger.exception('Failed to build monthly report payload')
        return jsonify({'status': 'error', 'message': str(e)}), 400


@app.route('/api/data-mining/reports/monthly/generate', methods=['POST'])
@login_required
def generate_monthly_report_now():
    if current_user.role not in ['admin', 'admin_phase1']:
        return jsonify({'error': 'Admin access required'}), 403

    try:
        body = request.get_json(silent=True) or {}
        year, month = _parse_report_month_year(body.get('year'), body.get('month'))
        report_text, report_data = generate_monthly_report(year=year, month=month, logger=app.logger)
        payload = {
            'month': month,
            'year': year,
            'items': report_data,
            'report_text': report_text,
            'generated_at': datetime.now().isoformat(),
            'total_approved_reservations': len(report_data)
        }
        app.logger.info('Manual monthly report generated by %s for %s/%s (%s reservations)', current_user.username, month, year, payload['total_approved_reservations'])
        return jsonify({'status': 'success', 'data': payload, 'message': 'Monthly report generated'})
    except Exception as e:
        app.logger.exception('Failed to generate monthly report manually')
        return jsonify({'status': 'error', 'message': str(e)}), 400


@app.route('/api/data-mining/reports/monthly/export', methods=['GET'])
@login_required
def export_monthly_report_excel():
    if current_user.role not in ['admin', 'admin_phase1']:
        return jsonify({'error': 'Admin access required'}), 403
    try:
        year, month = _parse_report_month_year(request.args.get('year'), request.args.get('month'))
        report_text, report_data = generate_monthly_report(year=year, month=month, logger=app.logger)
        # Only include the requested columns in the specified order
        columns = ['start_date', 'requester', 'department', 'facility', 'activity', 'contact_number']
        df = pd.DataFrame(report_data, columns=columns)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='Monthly Report')
        output.seek(0)
        filename = f"monthly_report_{year}_{month}.xlsx"
        return send_file(output, download_name=filename, as_attachment=True)
    except Exception as e:
        app.logger.exception('Failed to export monthly report as Excel')
        return jsonify({'status': 'error', 'message': str(e)}), 400
        sheet.append(['Total Approved Reservations', payload.get('total_approved_reservations', 0)])
        sheet.append([])
        sheet.append(['Date', 'Activity', 'Facility', 'Requester', 'Department', 'Status', 'Start Time', 'End Time'])

        for item in payload.get('items', []):
            sheet.append([
                item.get('date', ''),
                item.get('activity', ''),
                item.get('facility', ''),
                item.get('requester', ''),
                item.get('department', ''),
                item.get('status', ''),
                item.get('start_time', ''),
                item.get('end_time', ''),
            ])

        for column_cells in sheet.columns:
            max_length = 0
            column_letter = column_cells[0].column_letter
            for cell in column_cells:
                value = '' if cell.value is None else str(cell.value)
                if len(value) > max_length:
                    max_length = len(value)
            sheet.column_dimensions[column_letter].width = min(max_length + 2, 48)

        stream = BytesIO()
        workbook.save(stream)
        stream.seek(0)

        filename = f"monthly_report_{year}_{month:02d}.xlsx"
        return send_file(
            stream,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except Exception as e:
        app.logger.exception('Failed to export monthly report as Excel')
        return jsonify({'status': 'error', 'message': str(e)}), 400


def _is_reloader_process():
    werkzeug_flag = os.environ.get('WERKZEUG_RUN_MAIN')
    if werkzeug_flag is not None:
        return werkzeug_flag == 'true'
    return True


def start_stage2_deadline_scheduler(app):
    if not _is_reloader_process():
        return None

    scheduler = BackgroundScheduler(timezone='Asia/Manila')

    def auto_cancel_job():
        with app.app_context():
            try:
                auto_cancel_expired_reservations(app)
            except Exception as exc:
                app.logger.error('Stage 2 auto-cancel scheduler failed: %s', exc)

    def monthly_report_job():
        with app.app_context():
            try:
                count = _generate_monthly_report()
                app.logger.info(f'Monthly report generated successfully: {count} reservations')
            except Exception as exc:
                app.logger.error('Monthly report generation failed: %s', exc)

    # Run daily at 01:00 AM Manila time for auto-cancel
    scheduler.add_job(
        auto_cancel_job,
        CronTrigger(hour=1, minute=0),
        id='auto_cancel_stage2_deadline',
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    # Run at 00:05 AM on the 1st of each month (generates previous month's report)
    scheduler.add_job(
        monthly_report_job,
        CronTrigger(day=1, hour=0, minute=5),
        id='monthly_report_generation',
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    # Also perform one check immediately on startup.
    with app.app_context():
        auto_cancel_expired_reservations(app)

    scheduler.start()
    app.logger.info('Stage 2 deadline scheduler started (daily 01:00 Asia/Manila).')
    app.logger.info('Monthly report scheduler started (1st of each month at 00:05 Asia/Manila).')
    return scheduler


@app.before_request
def log_incoming_request():
    try:
        app.logger.info("Incoming request: %s %s from %s", request.method, request.path, request.remote_addr)
        # Log request headers for debugging CORS/preflight and client behavior
        try:
            headers_dict = dict(request.headers)
            app.logger.info("Request Headers: %s", headers_dict)
        except Exception:
            pass
        # Log JSON body for POST requests (non-destructive)
        if request.method == 'POST':
            try:
                data = request.get_json(silent=True)
                if data is not None:
                    app.logger.info("Request JSON: %s", data)
                else:
                    # fallback to raw data
                    raw = request.get_data(as_text=True)
                    if raw:
                        app.logger.info("Request body: %s", raw)
            except Exception as e:
                app.logger.debug("Could not parse request body: %s", e)
    except Exception:
        pass


# Provide an informational GET handler to avoid accidental 405s from visiting the URL
@app.route('/api/login', methods=['GET'])
def api_login_info():
    return jsonify({'message': 'This endpoint accepts POST with JSON {username, password}. Use the login form.'})


# Log response headers to help correlate server responses with client-side network traces
@app.after_request
def log_response_headers(response):
    try:
        app.logger.info("Response status: %s", response.status)
        try:
            resp_headers = dict(response.headers)
            app.logger.info("Response Headers: %s", resp_headers)
        except Exception:
            pass
    except Exception:
        pass
    return response

# ==================== WEB ROUTES ====================

@app.route('/app.jsx')
def serve_app_jsx():
    response = send_from_directory('templates', 'app.jsx', mimetype='text/javascript')
    # Prevent stale browser cache from serving an older frontend bundle.
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response
//HI

@app.route('/header2.png')
def serve_print_header_image():
    return send_from_directory('templates', 'header2.png', mimetype='image/png')


@app.route('/design.png')
def serve_login_background_image():
    return send_from_directory('templates', 'design.png', mimetype='image/png')

@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')
    user = User.query.filter_by(username=username).first()
    
    # Log web login attempt
    try:
        app.logger.info("/login attempt - username=%s remote=%s", username, request.remote_addr)
    except Exception:
        app.logger.info("/login attempt - username=%s", username)

    if not user:
        app.logger.warning("/login - user not found: %s", username)
        flash('Invalid username or password')
        return redirect(url_for('index'))

    if user.check_password(password):
        session.permanent = True
        login_user(user, remember=True)
        app.logger.info("/login success - user_id=%s username=%s", user.id, user.username)
        return redirect(url_for('index'))
    else:
        app.logger.warning("/login failed - incorrect password for user: %s", username)
        flash('Invalid username or password')
        return redirect(url_for('index'))


# Always allow /logout to succeed, even if not logged in
@app.route('/logout')
def logout():
    try:
        if current_user.is_authenticated:
            app.logger.info("/logout - user_id=%s username=%s remote=%s", current_user.id, current_user.username, request.remote_addr)
            logout_user()
        else:
            app.logger.info("/logout - user logout (not authenticated)")
    except Exception:
        app.logger.info("/logout - user logout (exception)")
    # Always redirect to index with 200 OK
    return redirect(url_for('index'))

@app.route('/setup')
def setup():
    with app.app_context():
        db.drop_all()
        db.create_all()
        
        users_to_add = [
            {'user': 'admin', 'pass': 'admin123', 'role': 'admin', 'dept': 'Administration'},
            {'user': 'admin_phase1', 'pass': 'phase1', 'role': 'admin_phase1', 'dept': 'Administration'},
            {'user': 'ccs', 'pass': '1234', 'role': 'student', 'dept': 'College of Computer Studies'},
            {'user': 'cas', 'pass': '1234', 'role': 'student', 'dept': 'College of Arts & Sciences'},
            {'user': 'ceaa', 'pass': '1234', 'role': 'student', 'dept': 'College of Engineering and Aviation'},
            {'user': 'coc', 'pass': '1234', 'role': 'student', 'dept': 'College of Criminalogy'},
        ]
        
        for u_data in users_to_add:
            user_obj = User(username=u_data['user'], role=u_data['role'], department=u_data['dept'])
            user_obj.set_password(u_data['pass'])
            db.session.add(user_obj)

        db.session.commit()

        rooms_list = [
            {'code': 'PAT', 'name': 'Performing Arts Theatre', 'capacity': 1500, 'desc': 'State-of-the-art facility for major university events.', 'usual': 'Concerts, Graduation, Large Plays'},
            {'code': 'TV_STUDIO', 'name': 'TV Studio', 'capacity': 50, 'desc': 'Equipped studio for media production.', 'usual': 'Filming, Broadcasts'},
            {'code': 'QUAD', 'name': 'Quadrangle', 'capacity': 3000, 'desc': 'Central open field for massive gatherings.', 'usual': 'Fairs, Exhibitions'},
            {'code': 'RADIO', 'name': 'Radio Room', 'capacity': 15, 'desc': 'Soundproof booth for audio recordings.', 'usual': 'Broadcasting, Podcasts'}
        ]

        for r_data in rooms_list:
            room_obj = Room(code=r_data['code'], name=r_data['name'], capacity=r_data['capacity'], description=r_data['desc'], usual_activity=r_data['usual'])
            db.session.add(room_obj)

        db.session.commit()

        return f"""
        <h1>Setup Complete!</h1>
        <ul>
            <li>{len(users_to_add)} Users created</li>
            <li>{len(rooms_list)} Facilities added</li>
        </ul>
        <a href='/'>Go to Dashboard</a>
        """

# ==================== API ROUTES ====================

# NEW: Check current user session endpoint
@app.route('/api/me', methods=['GET'])
def api_me():
    """Check if user is currently logged in and return their info"""
    if current_user.is_authenticated:
        return jsonify({
            'status': 'success',
            'user_id': current_user.id,
            'role': current_user.role,
            'username': current_user.username,
            'department': current_user.department
        })
    else:
        return jsonify({'status': 'error', 'message': 'Not authenticated'}), 401

# Authentication API - FIXED TO INCLUDE user_id
@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    user = User.query.filter_by(username=username).first()

    # Logging for debugging login issues (avoid logging passwords)
    try:
        app.logger.info(f"/api/login attempt - username=%s remote=%s", username, request.remote_addr)
    except Exception:
        app.logger.info(f"/api/login attempt - username=%s", username)

    if not user:
        app.logger.warning("/api/login - user not found: %s", username)
        return jsonify({'status': 'error', 'message': 'Invalid username or password'}), 401

    if user.check_password(password):
        session.permanent = True
        login_user(user, remember=True)
        app.logger.info("/api/login success - user_id=%s username=%s", user.id, user.username)
        return jsonify({
            'status': 'success',
            'user_id': user.id,
            'role': user.role,
            'username': user.username,
            'department': user.department
        })
    else:
        app.logger.warning("/api/login failed - incorrect password for user: %s", username)
        return jsonify({'status': 'error', 'message': 'Invalid username or password'}), 401

# API Logout
@app.route('/api/logout', methods=['POST'])
def api_logout():
    # Handle logout gracefully whether the client is authenticated or not.
    try:
        if current_user.is_authenticated:
            app.logger.info("/api/logout - user_id=%s username=%s remote=%s", current_user.id, current_user.username, request.remote_addr)
            logout_user()
        else:
            app.logger.info("/api/logout - no authenticated user (idempotent)")
    except Exception:
        app.logger.info("/api/logout called")
    return jsonify({'status': 'success'})


@app.route('/api/ai/chat', methods=['POST'])
@login_required
def ai_chat():
    try:
        client = _get_gemini_client()
        if not client:
            return jsonify({'error': 'Gemini API key is not configured on the server.'}), 500

        payload = request.get_json(silent=True) or {}
        messages = payload.get('messages', [])
        facilities = payload.get('facilities', [])
        calendar_events = payload.get('calendar_events', [])

        if not isinstance(messages, list) or not messages:
            return jsonify({'error': 'Messages are required.'}), 400

        conversation_parts = []
        facility_names = [str(f).strip() for f in facilities if str(f).strip()]
        if facility_names:
            conversation_parts.append("Available facilities from system records: " + ", ".join(facility_names))

        if isinstance(calendar_events, list) and calendar_events:
            # Keep only fields needed for reservation guidance and availability checks.
            normalized_calendar = []
            for event in calendar_events[:300]:
                if not isinstance(event, dict):
                    continue
                normalized_calendar.append({
                    'id': event.get('id'),
                    'event_type': event.get('event_type', 'reservation'),
                    'is_holiday': bool(event.get('is_holiday')),
                    'holiday_name': event.get('holiday_name'),
                    'activity_purpose': event.get('activity_purpose'),
                    'room_id': event.get('room_id'),
                    'room_name': event.get('room_name'),
                    'start_time': event.get('start_time'),
                    'end_time': event.get('end_time'),
                    'status': event.get('status'),
                    'calendar_category': event.get('calendar_category'),
                    'notes': event.get('notes'),
                })

            if normalized_calendar:
                conversation_parts.append(
                    'Calendar events from system records (JSON):\n' +
                    json.dumps(normalized_calendar, ensure_ascii=False)
                )

        for msg in messages:
            role = str(msg.get('role', 'user')).lower()
            text = str(msg.get('text', '')).strip()
            if not text:
                continue
            speaker = 'User' if role == 'user' else 'Assistant'
            conversation_parts.append(f"{speaker}: {text}")

        if not conversation_parts:
            return jsonify({'error': 'No valid message text provided.'}), 400

        prompt_text = "\n".join(conversation_parts)
        latest_user_text = ""
        for msg in reversed(messages):
            if str(msg.get('role', 'user')).lower() == 'user':
                latest_user_text = str(msg.get('text', '')).strip().lower()
                break

        # Check cache to reduce API calls (quota conservation)
        import hashlib
        prompt_hash = hashlib.sha256(prompt_text.encode()).hexdigest()
        cached_response = _get_cached_gemini_response(prompt_hash)
        if cached_response:
            app.logger.info('Returning cached Gemini response (quota conservation)')
            return jsonify({'reply': cached_response, 'cached': True})

        try:
            if client == "legacy-sdk":
                legacy_model = google_legacy_genai.GenerativeModel(
                    model_name=GEMINI_MODEL,
                    system_instruction=SYSTEM_PROMPT
                )
                response = legacy_model.generate_content(prompt_text)
                reply_text = str(getattr(response, 'text', '') or '').strip()
            else:
                response = client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=prompt_text,
                    config=google_genai_types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        temperature=0.2,
                        top_p=0.9,
                        max_output_tokens=1024,
                    ),
                )
                reply_text = str(getattr(response, 'text', '') or '').strip()
            if not reply_text:
                return jsonify({'error': 'Gemini returned an empty response.'}), 502

            # Cache successful response to reduce future quota usage
            _cache_gemini_request(prompt_hash, reply_text)
            return jsonify({'reply': reply_text})
        except Exception as exc:
            error_text = str(exc)
            app.logger.error('Gemini API call failed: %s', error_text)

            # Graceful degradation for quota/rate-limit failures.
            if 'RESOURCE_EXHAUSTED' in error_text or '429' in error_text or 'quota' in error_text.lower():
                if 'concept paper' in latest_user_text or 'how do i get a concept paper' in latest_user_text:
                    fallback_reply = (
                        'You must first speak with the facility coordinator responsible for the venue you want to reserve. '
                        'The coordinator will explain the required details. After drafting the concept paper, you must '
                        'have it officially signed by the Chancellor. Only a Concept Paper signed by the Chancellor can '
                        'be uploaded to your Google Drive to initiate a VacanSee reservation.'
                    )
                elif any(k in latest_user_text for k in ['process', 'workflow', 'how', 'reservation']):
                    fallback_reply = (
                        'VacanSee is currently running in limited mode due to AI quota limits. Here is the official workflow: '
                        'Stage 1: Submit event details plus a Google Drive link to your Chancellor-signed Concept Paper for '
                        'Concept Review. Stage 2: Once Stage 1 is approved, you have exactly 5 days to submit your Final Form '
                        'Google Drive link for Final Review. If approved, the reservation is confirmed.'
                    )
                else:
                    fallback_reply = (
                        'VacanSee AI is temporarily limited due to Gemini quota limits. I can still assist with the essentials: '
                        'facility/room, date and start/end time, activity purpose, number of attendees, person in charge, and '
                        'a Google Drive Concept Paper link signed by the Chancellor.'
                    )

                return jsonify({'reply': fallback_reply, 'degraded_mode': True})

            return jsonify({'error': f'Gemini API error: {error_text}'}), 502

    except Exception as outer_exc:
        outer_error_text = str(outer_exc)
        app.logger.error('Unexpected error in ai_chat: %s', outer_error_text)
        return jsonify({'error': f'An unexpected error occurred: {outer_error_text}'}), 500
@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    rooms = Room.query.order_by(*_room_ordering()).all()
    rooms_list = [{
        'id': room.id,
        'code': room.code,
        'name': room.name,
        'capacity': room.capacity,
        'description': room.description,
        'usual_activity': room.usual_activity,
        'detailed_info': room.detailed_info,
        'image_url': room.image_url,
        'position': room.position
    } for room in rooms]
    return jsonify(rooms_list)

# Get all approved calendar events (visible to all logged-in users)
@app.route('/api/calendar-events', methods=['GET'])
@login_required
def get_calendar_events():
    # Defensive clamp for corrupted historical rows where end_time was accidentally
    # written far in the future, causing events to span many months in the UI.
    max_calendar_span_days = 7

    def normalize_calendar_window(start_time, end_time):
        if not start_time:
            return None, None

        normalized_end = end_time or start_time
        if normalized_end < start_time:
            normalized_end = start_time

        if (normalized_end - start_time) > timedelta(days=max_calendar_span_days):
            normalized_end = datetime.combine(start_time.date(), time.max.replace(microsecond=0))

        return start_time, normalized_end

    def resolve_calendar_category(reservation, normalized_status):
        if normalized_status in ('deleted', 'denied', 'cancelled'):
            return 'cancelled'
        if normalized_status == 'concept-approved':
            return 'plotting'

        # All approved events show as green (ongoing), regardless of time
        if normalized_status == 'approved':
            return 'ongoing'

        return 'plotting'

    # Eagerly deny any expired concept-approved reservations before
    # returning calendar events. This removes them from the calendar
    # immediately on page load without waiting for the nightly scheduler.
    auto_cancel_expired_reservations(app)

    # Return calendar-relevant reservations:
    # - concept-approved events (pending final review, shown as plotting)
    # - approved events (normal / ongoing / plotting)
    # - cancelled events (legacy deleted also treated as cancelled)
    # NOTE: denied is excluded so auto-denied expired reservations
    # no longer appear on the calendar.
    reservations = Reservation.query.options(joinedload(Reservation.requester)).filter(
        or_(
            Reservation.status == 'concept-approved',
            Reservation.status == 'approved',
            Reservation.status == 'cancelled'
        )
    ).all()

    room_ids = {r.room_id for r in reservations if r.room_id is not None}
    rooms_by_id = {
        room.id: room.name
        for room in Room.query.filter(Room.id.in_(room_ids)).all()
    } if room_ids else {}

    events_list = []
    for r in reservations:
        normalized_status = 'cancelled' if r.status == 'deleted' else r.status
        normalized_start, normalized_end = normalize_calendar_window(r.start_time, r.end_time)
        events_list.append({
            'id': r.id,
            'room_id': r.room_id,
            'room_name': rooms_by_id.get(r.room_id, 'Unknown'),
            'activity_purpose': r.activity_purpose,
            'person_in_charge': r.person_in_charge or 'N/A',
            'start_time': normalized_start.isoformat() if normalized_start else None,
            'end_time': normalized_end.isoformat() if normalized_end else None,
            'department': r.requester.department if r.requester else 'Unknown',
            'status': normalized_status,
            'calendar_category': resolve_calendar_category(r, normalized_status),
            'event_type': 'reservation',
            'is_holiday': False,
        })

    # Include all admin-managed holidays so month navigation can show historical/future holidays.
    holiday_events = _build_manual_holiday_events()
    events_list.extend(holiday_events)

    events_list.sort(key=lambda e: (e.get('start_time') or '', str(e.get('activity_purpose') or '').lower()))
    return jsonify(events_list)

# Get all reservations (Admin and admin_phase1 see all, users see their own)
@app.route('/api/reservations', methods=['GET'])
@login_required
def get_reservations():
    # Eagerly deny expired concept-approved reservations so My Reservations
    # reflects correct status without waiting for the nightly scheduler.
    auto_cancel_expired_reservations(app)
    query = Reservation.query.options(joinedload(Reservation.requester))
    if current_user.role in ['admin', 'admin_phase1']:
        reservations = query.all()
    else:
        reservations = query.filter_by(user_id=current_user.id).all()

    room_ids = {r.room_id for r in reservations if r.room_id is not None}
    rooms_by_id = {
        room.id: room.name
        for room in Room.query.filter(Room.id.in_(room_ids)).all()
    } if room_ids else {}
    
    reservations_list = [{
        'id': r.id,
        'user_id': r.user_id,
        'user': _display_username(r.requester),
        'department': r.requester.department if r.requester else 'Unknown',
        'room_id': r.room_id,
        'room_name': r.room_name or 'Unknown',
        'activity_purpose': r.activity_purpose,
        'division': r.division,
        'department_temp': getattr(r, 'department_temp', '') or '',
        'attendees': r.attendees,
        'classification': r.classification,
        'person_in_charge': r.person_in_charge,
        'contact_number': r.contact_number,
        'start_time': r.start_time.isoformat() if r.start_time else None,
        'end_time': r.end_time.isoformat() if r.end_time else None,
        'status': r.status,
        'date_filed': r.date_filed.isoformat() if r.date_filed else None,
        'concept_approved_at': r.concept_approved_at.isoformat() if r.concept_approved_at else None,
        'concept_paper_url': r.concept_paper_url,
        'final_form_url': r.final_form_url,
        'final_form_uploaded': r.final_form_uploaded,
        'denial_reason': r.denial_reason,
        'equipment_data': r.get_equipment(),
        'archived_at': r.archived_at.isoformat() if r.archived_at else None
    } for r in reservations]
    
    return jsonify(reservations_list)

# Get a specific reservation by ID
@app.route('/api/reservations/<int:id>', methods=['GET'])
@login_required
def get_reservation(id):
    reservation = Reservation.query.options(joinedload(Reservation.requester)).filter_by(id=id).first()
    if not reservation:
        return jsonify({'error': 'Reservation not found'}), 404
    if current_user.role != 'admin' and reservation.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    return jsonify({
        'id': reservation.id,
        'user_id': reservation.user_id,
        'user': _display_username(reservation.requester),
        'department': reservation.requester.department if reservation.requester else 'Unknown',
        'room_id': reservation.room_id,
        'room_name': reservation.room_name or 'Unknown',
        'activity_purpose': reservation.activity_purpose,
        'division': reservation.division,
        'department_temp': getattr(reservation, 'department_temp', '') or '',
        'attendees': reservation.attendees,
        'classification': reservation.classification,
        'person_in_charge': reservation.person_in_charge,
        'contact_number': reservation.contact_number,
        'start_time': reservation.start_time.isoformat() if reservation.start_time else None,
        'end_time': reservation.end_time.isoformat() if reservation.end_time else None,
        'status': reservation.status,
        'date_filed': reservation.date_filed.isoformat() if reservation.date_filed else None,
        'concept_approved_at': reservation.concept_approved_at.isoformat() if reservation.concept_approved_at else None,
        'concept_paper_url': reservation.concept_paper_url,
        'final_form_url': reservation.final_form_url,
        'final_form_uploaded': reservation.final_form_uploaded,
        'denial_reason': reservation.denial_reason,
        'equipment_data': reservation.get_equipment(),
        'archived_at': reservation.archived_at.isoformat() if reservation.archived_at else None
    })

# Create new reservation
@app.route('/api/reservations', methods=['POST'])
@login_required
def create_reservation(): 
    data = request.get_json()
    
    try:
        start_time = datetime.fromisoformat(data['start_time'])
        end_time = datetime.fromisoformat(data['end_time'])

        now = datetime.now()
        if start_time < now:
            return jsonify({
                'status': 'error',
                'message': 'Start date/time cannot be in the past. Please pick a future schedule.'
            }), 400

        if end_time <= start_time:
            return jsonify({
                'status': 'error',
                'message': 'End date/time must be after the start date/time.'
            }), 400

        max_reservation_span_days = 7
        if (end_time - start_time) > timedelta(days=max_reservation_span_days):
            return jsonify({
                'status': 'error',
                'message': f'End date/time is too far from the start date/time. Maximum allowed span is {max_reservation_span_days} days.'
            }), 400

        holiday = _get_manual_holiday_in_range(start_time.date(), end_time.date())
        if holiday:
            return jsonify({
                'status': 'error',
                'message': f"Reservations are suspended on holidays. Conflict: {holiday.title} ({holiday.holiday_date.isoformat()})."
            }), 400

        # Set room_name snapshot
        room = db.session.get(Room, data['room_id'])
        reservation = Reservation(
            user_id=current_user.id,
            room_id=data['room_id'],
            room_name=room.name if room else None,
            activity_purpose=data['activity_purpose'],
            division=data.get('division', ''),
            attendees=data.get('attendees', 0),
            classification=data.get('classification', ''),
            person_in_charge=data['person_in_charge'],
            contact_number=data['contact_number'],
            start_time=start_time,
            end_time=end_time,
            concept_paper_url=data.get('concept_paper_url', ''),
            status='pending',
            date_filed=datetime.now()
        )
        # Save optional department override to its own column
        reservation.department_temp = (data.get('override_department') or data.get('department_temp') or '').strip() or None
        if 'equipment_data' in data:
            reservation.set_equipment(data['equipment_data'])
        db.session.add(reservation)
        db.session.commit()
        return jsonify({'status': 'success', 'id': reservation.id, 'message': 'Reservation created'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 400

# Upload final form (user submits final form URL after concept is approved)
@app.route('/api/reservations/<int:id>/upload-final-form', methods=['POST'])
@login_required
def upload_final_form(id):
    reservation = db.session.get(Reservation, id)
    if not reservation:
        return jsonify({'error': 'Reservation not found'}), 404
    
    if current_user.role != 'admin' and reservation.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    reservation.final_form_url = data.get('final_form_url', '')
    reservation.final_form_uploaded = True
    
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Final form uploaded'})

# Expire reservation (called by frontend when Stage 2 deadline passes)
@app.route('/api/reservations/<int:id>/expire', methods=['POST'])
@login_required
def expire_reservation(id):
    """Mark concept-approved reservation as denied when Stage 2 deadline passes.
    
    Called by the frontend countdown timer. This is a best-effort operation —
    the nightly scheduler will also catch expired reservations, so failures here
    are non-critical."""
    reservation = db.session.get(Reservation, id)
    if not reservation:
        return jsonify({'status': 'success', 'message': 'Reservation not found (already processed)'}), 200
    
    # Only the owner or admin can expire
    if current_user.role not in ['admin', 'admin_phase1'] and reservation.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Only expire concept-approved reservations without final forms
    if reservation.status != 'concept-approved':
        return jsonify({'status': 'success', 'message': 'Reservation status already changed'}), 200
    
    has_final_form = bool(reservation.final_form_uploaded or (reservation.final_form_url or '').strip())
    if has_final_form:
        return jsonify({'status': 'success', 'message': 'Final form already submitted'}), 200
    
    # Mark as denied (scheduler-initiated expiry logic is the source of truth for deadline calculation)
    reservation.status = 'denied'
    reservation.denial_reason = (
        'Stage 2 submission deadline expired. The final form was not uploaded '
        'within 5 days of concept approval. This reservation was automatically '
        'denied by the system.'
    )
    db.session.commit()
    
    return jsonify({'status': 'success', 'message': 'Reservation expired and marked as denied'})

# Approve concept (Stage 1) - Admin only
@app.route('/api/reservations/<int:id>/approve-concept', methods=['POST'])
@login_required
def approve_concept(id):
    if current_user.role not in ['admin', 'admin_phase1']:
        return jsonify({'error': 'Admin or Phase1 Admin access required'}), 403
    
    reservation = db.session.get(Reservation, id)
    if not reservation:
        return jsonify({'error': 'Reservation not found'}), 404
    
    reservation.status = 'concept-approved'
    reservation.concept_approved_at = datetime.now()
    db.session.commit()
    
    return jsonify({'status': 'success', 'message': 'Concept approved'})

# Approve final (Stage 2) - Admin only
@app.route('/api/reservations/<int:id>/approve-final', methods=['POST'])
@login_required
def approve_final(id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    reservation = db.session.get(Reservation, id)
    if not reservation:
        return jsonify({'error': 'Reservation not found'}), 404

    holiday = _get_manual_holiday_in_range(reservation.start_time.date(), reservation.end_time.date())
    if holiday:
        return jsonify({
            'error': f"Cannot approve final reservation due to holiday conflict: {holiday.title} ({holiday.holiday_date.isoformat()})."
        }), 400
    
    reservation.status = 'approved'
    reservation.archived_at = None
    db.session.commit()
    
    return jsonify({'status': 'success', 'message': 'Final form approved, reservation confirmed'})

# Deny reservation - Admin and admin_phase1 can deny
@app.route('/api/reservations/<int:id>/deny', methods=['POST'])
@login_required
def deny_reservation(id):
    if current_user.role not in ['admin', 'admin_phase1']:
        return jsonify({'error': 'Admin access required'}), 403
    
    reservation = db.session.get(Reservation, id)
    if not reservation:
        return jsonify({'error': 'Reservation not found'}), 404
    
    data = request.get_json()
    reservation.status = 'denied'
    reservation.denial_reason = data.get('reason', 'No reason provided')
    # Do NOT archive immediately; stays in reservation list for user
    reservation.archived_at = None
    # Notification logic (placeholder: log, replace with real notification system if needed)
    user = db.session.get(User, reservation.user_id)
    if user:
        app.logger.info(f"Notified user {user.username} (ID: {user.id}) that their reservation '{reservation.activity_purpose}' was denied. Reason: {reservation.denial_reason}")
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Reservation denied and user notified'})
@app.route('/api/reservations/<int:id>/archive', methods=['POST'])
@login_required
def archive_reservation(id):
    reservation = db.session.get(Reservation, id)
    if not reservation:
        return jsonify({'error': 'Reservation not found'}), 404

    is_admin = current_user.role in ['admin', 'admin_phase1']

    # Only the owner can archive their own reservation unless admin.
    if not is_admin and reservation.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403

    # Non-admin users can archive only specific statuses.
    if not is_admin and reservation.status not in ['denied', 'approved', 'cancelled']:
        return jsonify({'error': 'Only denied, approved, or cancelled reservations can be archived'}), 400

    reservation.archived_at = datetime.now()
    db.session.commit()

    return jsonify({'status': 'success', 'message': 'Reservation archived'})

# Cancel event from calendar (Admin only) - with notification to user
@app.route('/api/reservations/<int:id>/delete-event', methods=['POST'])
@login_required
def delete_event(id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    reservation = db.session.get(Reservation, id)
    if not reservation:
        return jsonify({'error': 'Reservation not found'}), 404
    
    data = request.get_json() or {}
    reason = data.get('reason', 'No reason provided')
    action = str(data.get('action', '')).strip().lower()

    current_status = str(reservation.status or '').lower()
    is_cancelled = current_status in ['cancelled', 'deleted', 'denied']

    now = datetime.now()
    start_time = reservation.start_time
    end_time = reservation.end_time
    is_ongoing = bool(start_time and end_time and start_time <= now <= end_time and not is_cancelled)
    is_scheduled = bool(start_time and now < start_time and not is_cancelled)

    # Allow cancel for both ongoing and scheduled events
    if is_cancelled:
        expected_action = 'delete'
    elif is_ongoing or is_scheduled:
        expected_action = 'cancel'
    else:
        expected_action = 'delete'

    if action and action != expected_action:
        return jsonify({'error': f'Invalid action for this event. Expected "{expected_action}".'}), 400

    if expected_action == 'delete':
        db.session.delete(reservation)
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Event deleted permanently'})

    # Cancel the event (for both ongoing and scheduled)
    reservation.status = 'cancelled'
    reservation.denial_reason = reason
    reservation.archived_at = now

    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Event cancelled and user notified'})

# Delete reservation
@app.route('/api/reservations/<int:id>', methods=['DELETE'])
@login_required
def delete_reservation(id):
    reservation = db.session.get(Reservation, id)
    if not reservation:
        return jsonify({'error': 'Reservation not found'}), 404
    
    if current_user.role != 'admin' and reservation.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Soft delete: preserve record for audit/history and calendar integrity
    reservation.status = 'deleted'
    reservation.archived_at = datetime.now()
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Reservation soft-deleted'})

# Get archived/denied reservations
@app.route('/api/archive', methods=['GET'])
@login_required
def get_archive():
    from sqlalchemy import or_
    query = Reservation.query.options(joinedload(Reservation.requester))
    if current_user.role in ['admin', 'admin_phase1']:
        # Include denied, cancelled (including legacy deleted), or any reservation with archived_at set
        archived = query.filter(
            or_(
                Reservation.status.in_(['denied', 'cancelled', 'deleted']),
                Reservation.archived_at != None
            )
        ).all()
    else:
        archived = query.filter_by(user_id=current_user.id).filter(
            or_(
                Reservation.status.in_(['denied', 'cancelled', 'deleted']),
                Reservation.archived_at != None
            )
        ).all()
    
    archive_list = [{
        'id': r.id,
        'user_id': r.user_id,
        'user': _display_username(r.requester),
        'department': r.requester.department if r.requester else 'Unknown',
        'room_id': r.room_id,
        'room_name': r.room_name or 'Unknown',
        'activity_purpose': r.activity_purpose,
        'start_time': r.start_time.isoformat() if r.start_time else None,
        'end_time': r.end_time.isoformat() if r.end_time else None,
        'status': r.status,
        'denial_reason': r.denial_reason,
        'archived_at': r.archived_at.isoformat() if r.archived_at else None
    } for r in archived]
    
    return jsonify(archive_list)


@app.route('/api/holidays', methods=['POST'])
@login_required
def create_holiday():
    if current_user.role not in ['admin', 'admin_phase1']:
        return jsonify({'error': 'Admin access required'}), 403

    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    holiday_date_raw = (data.get('holiday_date') or '').strip()
    notes = (data.get('notes') or '').strip()

    if not title:
        return jsonify({'status': 'error', 'message': 'Holiday title is required'}), 400
    if not holiday_date_raw:
        return jsonify({'status': 'error', 'message': 'Holiday date is required'}), 400

    try:
        holiday_date = datetime.fromisoformat(holiday_date_raw).date()
    except ValueError:
        return jsonify({'status': 'error', 'message': 'Invalid holiday date format'}), 400

    existing = Holiday.query.filter_by(holiday_date=holiday_date).first()
    if existing:
        return jsonify({'status': 'error', 'message': f'A holiday is already set on {holiday_date.isoformat()} ({existing.title}).'}), 400

    holiday = Holiday(
        title=title,
        holiday_date=holiday_date,
        notes=notes,
        created_by=current_user.id
    )
    db.session.add(holiday)
    db.session.commit()

    return jsonify({'status': 'success', 'id': holiday.id, 'message': 'Holiday added to calendar'})


@app.route('/api/holidays/<int:holiday_id>', methods=['DELETE'])
@login_required
def delete_holiday(holiday_id):
    if current_user.role not in ['admin', 'admin_phase1']:
        return jsonify({'error': 'Admin access required'}), 403

    holiday = db.session.get(Holiday, holiday_id)
    if not holiday:
        return jsonify({'status': 'error', 'message': 'Holiday not found'}), 404

    db.session.delete(holiday)
    db.session.commit()

    return jsonify({'status': 'success', 'message': 'Holiday removed from calendar'})

# Get analytics - Admin only
@app.route('/api/analytics', methods=['GET'])
@login_required
def get_analytics():
    if current_user.role not in ['admin', 'admin_phase1']:
        return jsonify({'error': 'Admin access required'}), 403

    analytics_data = build_analytics_snapshot()
    kpis = analytics_data.get('kpis', {})

    # Backward-compatible response shape for older frontend calls.
    return jsonify({
        'total': kpis.get('total_reservations', 0),
        'pending': kpis.get('pending', 0),
        'concept_approved': kpis.get('concept_approved', 0),
        'approved': kpis.get('approved', 0),
        'denied': kpis.get('denied', 0)
    })


# New data mining endpoint for KPI + charts used by Analytics dashboard
@app.route('/api/data-mining/analytics', methods=['GET'])
@login_required
def get_data_mining_analytics():
    if current_user.role not in ['admin', 'admin_phase1']:
        return jsonify({'error': 'Admin access required'}), 403

    try:
        department = (request.args.get('department') or '').strip() or None
        heatmap_month = (request.args.get('heatmap_month') or '').strip() or None
        filter_start_month = (request.args.get('filter_start_month') or '').strip() or None
        filter_end_month = (request.args.get('filter_end_month') or '').strip() or None
        try:
            months = int(request.args.get('months', 6))
        except (TypeError, ValueError):
            months = 6

        payload = build_analytics_snapshot(
            months=months,
            department=department,
            heatmap_month=heatmap_month,
            filter_start_month=filter_start_month,
            filter_end_month=filter_end_month,
        )
        return jsonify({'status': 'success', 'data': payload})
    except Exception as e:
        app.logger.exception("Failed to build analytics snapshot")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/data-mining/forecast/periods', methods=['GET'])
@login_required
def get_forecast_periods():
    if current_user.role not in ['admin', 'admin_phase1']:
        return jsonify({'error': 'Admin access required'}), 403

    try:
        payload = forecast_all_academic_periods()
        return jsonify({
            'status': 'success',
            'data': payload,
            'next_retrain_at': get_next_retrain_at_iso(),
            'retrain_basis': 'approved_only',
        })
    except Exception as e:
        app.logger.exception('Failed to build semester forecasts')
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/data-mining/forecast/period/<period_key>', methods=['GET'])
@login_required
def get_forecast_period(period_key):
    if current_user.role not in ['admin', 'admin_phase1']:
        return jsonify({'error': 'Admin access required'}), 403

    try:
        payload = forecast_for_period(period_key)
        return jsonify({'status': 'success', 'data': payload})
    except Exception as e:
        app.logger.exception('Failed to build period forecast for %s', period_key)
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/data-mining/forecast/current-semester', methods=['GET'])
@login_required
def get_current_semester_forecast():
    if current_user.role not in ['admin', 'admin_phase1']:
        return jsonify({'error': 'Admin access required'}), 403

    try:
        payload = forecast_current_semester()
        return jsonify({
            'status': 'success',
            'data': payload,
            'next_retrain_at': get_next_retrain_at_iso(),
            'retrain_basis': 'approved_only',
        })
    except Exception as e:
        app.logger.exception('Failed to build current semester forecast')
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/data-mining/forecast/retrain', methods=['POST'])
@login_required
def retrain_forecast_model():
    if current_user.role not in ['admin', 'admin_phase1']:
        return jsonify({'error': 'Admin access required'}), 403

    try:
        metadata = retrain_all_historical_data(include_statuses=['approved'])
        return jsonify({
            'status': 'success',
            'message': 'SARIMAX model retrained using approved reservations only.',
            'metadata': metadata,
            'next_retrain_at': get_next_retrain_at_iso(),
            'retrain_basis': 'approved_only',
        })
    except Exception as e:
        app.logger.exception('Failed to retrain forecasting model')
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ==================== SETTINGS ROUTES ====================

@app.route('/api/settings/profile', methods=['PUT'])
@login_required
def update_my_profile():
    return jsonify({
        'status': 'error',
        'message': 'Profile name change is temporarily disabled.'
    }), 403


@app.route('/api/settings/password', methods=['PUT'])
@login_required
def update_my_password():
    data = request.get_json() or {}
    current_password = data.get('current_password') or ''
    new_password = data.get('new_password') or ''

    if not current_password or not new_password:
        return jsonify({'status': 'error', 'message': 'Current and new password are required'}), 400

    if len(new_password) < 4:
        return jsonify({'status': 'error', 'message': 'New password must be at least 4 characters'}), 400

    if not current_user.check_password(current_password):
        return jsonify({'status': 'error', 'message': 'Current password is incorrect'}), 401

    current_user.set_password(new_password)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Password updated'})


def _require_admin_settings_access():
    if current_user.role not in ['admin', 'admin_phase1']:
        return jsonify({'status': 'error', 'message': 'Admin access required'}), 403
    return None


def _uploaded_facility_image_path(image_url):
    """Extract S3 object key or local file path from image_url."""
    if not image_url:
        return None
    
    value = (image_url or '').strip()
    if not value:
        return None
    
    # Check if it's a local storage URL
    if value.startswith('/static/uploads/'):
        return value
    
    # Check if it's a Supabase public storage URL
    # Format: https://{project}.storage.supabase.co/storage/v1/object/public/{bucket}/{key_with_folders}
    # We need to extract everything after /public/image_loc/ which gives us facilities/{filename}
    if 'storage.supabase.co/storage/v1/object/public/' in value:
        try:
            # Find the start of the bucket name
            start_idx = value.index('storage.supabase.co/storage/v1/object/public/') + len('storage.supabase.co/storage/v1/object/public/')
            # Get everything after /public/, which includes bucket/path
            full_path = value[start_idx:]
            # Skip the bucket name (image_loc/) and return the rest (facilities/filename)
            if full_path.startswith('image_loc/'):
                return full_path[len('image_loc/'):]  # Return facilities/filename
            return full_path  # Fallback
        except Exception:
            return None
    
    return None


def _delete_uploaded_facility_image(image_url):
    """Best-effort deletion of a facility image from local storage or S3."""
    path = _uploaded_facility_image_path(image_url)
    if not path:
        return
    
    # Check if it's a local file
    if path.startswith('/static/uploads/'):
        try:
            filepath = os.path.join(os.path.dirname(__file__), path.lstrip('/'))
            if os.path.exists(filepath):
                os.remove(filepath)
                app.logger.info(f"Deleted local facility image: {path}")
        except Exception as e:
            app.logger.warning(f"Could not delete local facility image '{path}': {e}")
    else:
        # Try to delete from S3
        if not s3_client:
            app.logger.debug(f"S3 client not initialized, skipping S3 deletion for {path}")
            return
        
        try:
            # path is already the full S3 key: facilities/{filename}
            s3_client.delete_object(Bucket=S3_BUCKET, Key=path)
            app.logger.info(f"Deleted facility image from S3: {path}")
        except ClientError as e:
            app.logger.warning(f"Could not delete facility image '{path}' from S3: {e}")


@app.route('/api/admin/facilities', methods=['GET'])
@login_required
def admin_get_facilities():
    denied = _require_admin_settings_access()
    if denied:
        return denied

    rooms = Room.query.order_by(*_room_ordering()).all()
    return jsonify([
        {
            'id': room.id,
            'code': room.code,
            'name': room.name,
            'capacity': room.capacity,
            'description': room.description,
            'usual_activity': room.usual_activity,
            'detailed_info': room.detailed_info,
            'image_url': room.image_url,
            'position': room.position
        }
        for room in rooms
    ])


@app.route('/api/admin/facilities', methods=['POST'])
@login_required
def admin_create_facility():
    denied = _require_admin_settings_access()
    if denied:
        return denied

    data = request.get_json() or {}
    code = (data.get('code') or '').strip() or None
    name = (data.get('name') or '').strip()
    capacity = data.get('capacity')
    position_raw = data.get('position')
    position = None

    if position_raw is not None and str(position_raw).strip() != '':
        try:
            position = int(position_raw)
        except (TypeError, ValueError):
            return jsonify({'status': 'error', 'message': 'Position must be a number'}), 400

    if not name or capacity is None:
        return jsonify({'status': 'error', 'message': 'Name and capacity are required'}), 400

    if code and Room.query.filter_by(code=code).first():
        return jsonify({'status': 'error', 'message': 'Facility code already exists'}), 409

    if position is None:
        max_position = db.session.query(db.func.max(Room.position)).scalar()
        position = (max_position or 0) + 1

    room = Room(
        code=code,
        name=name,
        capacity=int(capacity),
        description=(data.get('description') or '').strip(),
        usual_activity=(data.get('usual_activity') or '').strip(),
        detailed_info=(data.get('detailed_info') or '').strip(),
        image_url=(data.get('image_url') or '').strip(),
        position=position
    )
    db.session.add(room)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Facility created', 'id': room.id})


@app.route('/api/admin/facilities/<int:id>', methods=['PUT'])
@login_required
def admin_update_facility(id):
    denied = _require_admin_settings_access()
    if denied:
        return denied

    room = db.session.get(Room, id)
    if not room:
        return jsonify({'status': 'error', 'message': 'Facility not found'}), 404

    data = request.get_json() or {}
    code = (data.get('code') or '').strip() or None
    name = (data.get('name') or '').strip()
    capacity = data.get('capacity')
    position_raw = data.get('position')

    if not name or capacity is None:
        return jsonify({'status': 'error', 'message': 'Name and capacity are required'}), 400

    if code:
        duplicate = Room.query.filter(Room.code == code, Room.id != id).first()
        if duplicate:
            return jsonify({'status': 'error', 'message': 'Facility code already exists'}), 409

    room.code = code
    room.name = name
    room.capacity = int(capacity)
    room.description = (data.get('description') or '').strip()
    room.usual_activity = (data.get('usual_activity') or '').strip()
    room.detailed_info = (data.get('detailed_info') or '').strip()
    if 'position' in data:
        if position_raw is None or str(position_raw).strip() == '':
            room.position = None
        else:
            try:
                room.position = int(position_raw)
            except (TypeError, ValueError):
                return jsonify({'status': 'error', 'message': 'Position must be a number'}), 400
    new_image_url = (data.get('image_url') or '').strip()
    old_image_url = (room.image_url or '').strip()

    # If image is replaced/removed, delete the old locally uploaded file.
    if old_image_url and old_image_url != new_image_url:
        _delete_uploaded_facility_image(old_image_url)

    room.image_url = new_image_url

    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Facility updated'})


@app.route('/api/admin/facilities/upload-image', methods=['POST'])
@login_required
def admin_upload_facility_image():
    denied = _require_admin_settings_access()
    if denied:
        return denied

    if 'image' not in request.files:
        return jsonify({'status': 'error', 'message': 'No image file provided'}), 400

    image_file = request.files['image']
    if image_file.filename == '':
        return jsonify({'status': 'error', 'message': 'Empty filename'}), 400

    previous_image_url = (request.form.get('previous_image_url') or '').strip()

    ext = os.path.splitext(image_file.filename)[1].lower()
    allowed = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
    if ext not in allowed:
        return jsonify({'status': 'error', 'message': 'Unsupported image format'}), 400

    try:
        # Generate unique filename
        filename = f"facility_{uuid.uuid4().hex}{ext}"
        
        # Try S3 upload if configured
        if s3_client:
            try:
                object_key = f"facilities/{filename}"
                file_content = image_file.read()
                
                # Upload to S3
                s3_client.put_object(
                    Bucket=S3_BUCKET,
                    Key=object_key,
                    Body=file_content,
                    ContentType=f"image/{ext.lstrip('.')}"
                )
                
                # Generate PUBLIC URL for Supabase Storage
                # Format: https://{project}.storage.supabase.co/storage/v1/object/public/{bucket}/{key}
                project_id = S3_ENDPOINT.split('.')[0].replace('https://', '')
                image_url = f"https://{project_id}.storage.supabase.co/storage/v1/object/public/{S3_BUCKET}/{object_key}"
                
                # Delete previous image if provided
                if previous_image_url:
                    _delete_uploaded_facility_image(previous_image_url)
                
                app.logger.info(f"Successfully uploaded facility image to S3: {object_key} -> {image_url}")
                return jsonify({'status': 'success', 'image_url': image_url, 'storage': 'S3'})
            except Exception as s3_error:
                app.logger.warning(f"S3 upload failed: {s3_error}. Falling back to local storage.")
        
        # Fallback to local file storage
        upload_dir = os.path.join(os.path.dirname(__file__), 'static', 'uploads')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save the file
        filepath = os.path.join(upload_dir, filename)
        image_file.save(filepath)
        
        # Generate URL
        image_url = f"/static/uploads/{filename}"
        
        # Delete previous image if provided
        if previous_image_url:
            _delete_uploaded_facility_image(previous_image_url)
        
        app.logger.info(f"Successfully uploaded facility image to local storage: {filename}")
        return jsonify({'status': 'success', 'image_url': image_url, 'storage': 'local'})
    
    except Exception as e:
        app.logger.error(f"Failed to upload image: {e}", exc_info=True)
        return jsonify({'status': 'error', 'message': f'Upload failed: {str(e)}'}), 500


@app.route('/api/admin/facilities/<int:id>', methods=['DELETE'])
@login_required
def admin_delete_facility(id):
    denied = _require_admin_settings_access()
    if denied:
        return denied

    room = db.session.get(Room, id)
    if not room:
        return jsonify({'status': 'error', 'message': 'Facility not found'}), 404

    # Nullify room_id on all reservations before deleting
    # room_name snapshot already preserves the facility name
    Reservation.query.filter_by(room_id=id).update({'room_id': None})
    db.session.flush()

    _delete_uploaded_facility_image((room.image_url or '').strip())

    db.session.delete(room)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Facility deleted successfully'})


@app.route('/api/admin/users', methods=['GET'])
@login_required
def admin_get_users():
    denied = _require_admin_settings_access()
    if denied:
        return denied

    users = User.query.order_by(User.username.asc()).all()
    return jsonify([
        {
            'id': user.id,
            'username': user.username,
            'role': user.role,
            'department': user.department
        }
        for user in users
        if user.username != 'deleted_account'
    ])


@app.route('/api/admin/users', methods=['POST'])
@login_required
def admin_create_user():
    denied = _require_admin_settings_access()
    if denied:
        return denied

    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    role = (data.get('role') or 'student').strip()
    department = (data.get('department') or '').strip()

    if not username or not password:
        return jsonify({'status': 'error', 'message': 'Username and password are required'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'status': 'error', 'message': 'Username already exists'}), 409

    user = User(username=username, role=role, department=department)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'User account created', 'id': user.id})


@app.route('/api/admin/users/<int:id>', methods=['PUT'])
@login_required
def admin_update_user(id):
    denied = _require_admin_settings_access()
    if denied:
        return denied

    user = db.session.get(User, id)
    if not user:
        return jsonify({'status': 'error', 'message': 'User not found'}), 404

    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    role = (data.get('role') or user.role).strip()
    department = (data.get('department') or '').strip()
    new_password = data.get('password') or ''

    if not username:
        return jsonify({'status': 'error', 'message': 'Username is required'}), 400

    duplicate = User.query.filter(User.username == username, User.id != id).first()
    if duplicate:
        return jsonify({'status': 'error', 'message': 'Username already exists'}), 409

    user.username = username
    user.role = role
    user.department = department
    if new_password:
        user.set_password(new_password)

    db.session.commit()
    return jsonify({'status': 'success', 'message': 'User account updated'})


@app.route('/api/admin/users/<int:id>', methods=['DELETE'])
@login_required
def admin_delete_user(id):
    denied = _require_admin_settings_access()
    if denied:
        return denied

    if current_user.id == id:
        return jsonify({'status': 'error', 'message': 'You cannot delete your own account'}), 409

    user = db.session.get(User, id)
    if not user:
        return jsonify({'status': 'error', 'message': 'User not found'}), 404

    if user.username == 'deleted_account':
        return jsonify({'status': 'error', 'message': 'System account cannot be deleted'}), 409

    # Remove pending reservations owned by the account, but preserve calendar-visible
    # reservations by reassigning them to a placeholder account.
    pending_reservations = Reservation.query.filter_by(user_id=id, status='pending').all()
    for reservation in pending_reservations:
        db.session.delete(reservation)

    remaining_reservations = Reservation.query.filter(
        Reservation.user_id == id,
        Reservation.status != 'pending'
    ).all()

    placeholder = User.query.filter_by(username='deleted_account').first()
    if not placeholder:
        placeholder = User(username='deleted_account', role='student', department='Archived Accounts')
        placeholder.set_password('deleted_account')
        db.session.add(placeholder)
        db.session.flush()

    for reservation in remaining_reservations:
        reservation.user_id = placeholder.id

    # Preserve holidays by reassigning creator to placeholder
    Holiday.query.filter_by(created_by=id).update({'created_by': placeholder.id})

    db.session.delete(user)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'User account deleted'})

if __name__ == '__main__':
    training_scheduler = start_training_scheduler(app)
    stage2_deadline_scheduler = start_stage2_deadline_scheduler(app)
    debug_mode = os.getenv('DEBUG', 'False').lower() == 'true'
    app.run(debug=debug_mode)