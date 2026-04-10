import os
import json
import uuid
import requests
from urllib.parse import urlparse
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, send_from_directory
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_cors import CORS
from datetime import datetime
from sqlalchemy import inspect
from dotenv import load_dotenv
from models import db, User, Room, Reservation 
from data_mining.analytics import build_analytics_snapshot
from data_mining.forecast_utils import forecast_all_academic_periods, forecast_for_period, forecast_current_semester
from data_mining.train_holt_winters_model import retrain_all_historical_data
from scheduler import start_training_scheduler, get_next_retrain_at_iso

app = Flask(__name__)

# Enable CORS
CORS(app, supports_credentials=True, origins=[
    'http://localhost:3000', 'http://localhost:5000',
    'http://127.0.0.1:3000', 'http://127.0.0.1:5000'
])

# CONFIG
app.config['SECRET_KEY'] = 'thesis-secret-key-123'

# Load environment variables from your .env file
load_dotenv()

# Grab the Supabase URL from the environment
db_url = os.getenv("DATABASE_URL")

# Fix the SQLAlchemy URI quirk (changes postgres:// to postgresql://)
if db_url and db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Configure SQLAlchemy to use Supabase
app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# AI CONFIG (Gemini API)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = os.getenv(
    "GEMINI_URL",
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
)

# Initialize extensions
db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
training_scheduler = None

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


def _display_username(user):
    if not user:
        return 'Unknown'
    if user.username == 'deleted_account':
        return 'Deleted Account'
    return user.username

# Create tables
with app.app_context():
    db.create_all()


def _ensure_room_columns():
    """Backfill new room columns for existing SQLite databases without migrations."""
    inspector = inspect(db.engine)
    columns = {c['name'] for c in inspector.get_columns('rooms')}

    with db.engine.begin() as conn:
        if 'detailed_info' not in columns:
            conn.exec_driver_sql("ALTER TABLE rooms ADD COLUMN detailed_info TEXT")
        if 'image_url' not in columns:
            conn.exec_driver_sql("ALTER TABLE rooms ADD COLUMN image_url VARCHAR(500)")


with app.app_context():
    _ensure_room_columns()


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

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/app.jsx')
def serve_app_jsx():
    response = send_from_directory('templates', 'app.jsx', mimetype='text/javascript')
    # Prevent stale browser cache from serving an older frontend bundle.
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

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
        login_user(user)
        app.logger.info("/login success - user_id=%s username=%s", user.id, user.username)
        return redirect(url_for('index'))
    else:
        app.logger.warning("/login failed - incorrect password for user: %s", username)
        flash('Invalid username or password')
        return redirect(url_for('index'))

@app.route('/logout')
@login_required
def logout():
    try:
        app.logger.info("/logout - user_id=%s username=%s remote=%s", current_user.id, current_user.username, request.remote_addr)
    except Exception:
        app.logger.info("/logout - user logout")
    logout_user()
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
        login_user(user)
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

# Get all rooms
@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    rooms = Room.query.all()
    rooms_list = [{
        'id': room.id,
        'code': room.code,
        'name': room.name,
        'capacity': room.capacity,
        'description': room.description,
        'usual_activity': room.usual_activity,
        'detailed_info': room.detailed_info,
        'image_url': room.image_url
    } for room in rooms]
    return jsonify(rooms_list)

# Get all approved calendar events (visible to all logged-in users)
@app.route('/api/calendar-events', methods=['GET'])
@login_required
def get_calendar_events():
    # Return all approved reservations for the calendar (including archived approved events)
    reservations = Reservation.query.filter_by(status='approved').all()
    events_list = [{
        'id': r.id,
        'room_id': r.room_id,
        'room_name': db.session.get(Room, r.room_id).name if db.session.get(Room, r.room_id) else 'Unknown',
        'activity_purpose': r.activity_purpose,
        'person_in_charge': r.person_in_charge or 'N/A',
        'start_time': r.start_time.isoformat() if r.start_time else None,
        'end_time': r.end_time.isoformat() if r.end_time else None,
        'department': r.requester.department if r.requester else 'Unknown'
    } for r in reservations]
    return jsonify(events_list)

# Get all reservations (Admin and admin_phase1 see all, users see their own)
@app.route('/api/reservations', methods=['GET'])
@login_required
def get_reservations():
    if current_user.role in ['admin', 'admin_phase1']:
        reservations = Reservation.query.all()
    else:
        reservations = Reservation.query.filter_by(user_id=current_user.id).all()
    
    reservations_list = [{
        'id': r.id,
        'user_id': r.user_id,
        'user': _display_username(r.requester),
        'department': r.requester.department if r.requester else 'Unknown',
        'room_id': r.room_id,
        'room_name': db.session.get(Room, r.room_id).name if db.session.get(Room, r.room_id) else 'Unknown',
        'activity_purpose': r.activity_purpose,
        'division': r.division,
        'attendees': r.attendees,
        'classification': r.classification,
        'person_in_charge': r.person_in_charge,
        'contact_number': r.contact_number,
        'start_time': r.start_time.isoformat() if r.start_time else None,
        'end_time': r.end_time.isoformat() if r.end_time else None,
        'status': r.status,
        'date_filed': r.date_filed.isoformat() if r.date_filed else None,
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
    reservation = db.session.get(Reservation, id)
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
        'room_name': db.session.get(Room, reservation.room_id).name if db.session.get(Room, reservation.room_id) else 'Unknown',
        'activity_purpose': reservation.activity_purpose,
        'division': reservation.division,
        'attendees': reservation.attendees,
        'classification': reservation.classification,
        'person_in_charge': reservation.person_in_charge,
        'contact_number': reservation.contact_number,
        'start_time': reservation.start_time.isoformat() if reservation.start_time else None,
        'end_time': reservation.end_time.isoformat() if reservation.end_time else None,
        'status': reservation.status,
        'date_filed': reservation.date_filed.isoformat() if reservation.date_filed else None,
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
        reservation = Reservation(
            user_id=current_user.id,
            room_id=data['room_id'],
            activity_purpose=data['activity_purpose'],
            division=data.get('division', ''),
            attendees=data.get('attendees', 0),
            classification=data.get('classification', ''),
            person_in_charge=data['person_in_charge'],
            contact_number=data['contact_number'],
            start_time=datetime.fromisoformat(data['start_time']),
            end_time=datetime.fromisoformat(data['end_time']),
            concept_paper_url=data.get('concept_paper_url', ''),
            status='pending',
            date_filed=datetime.now()
        )
        
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
    
    reservation.status = 'approved'
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
    reservation.archived_at = datetime.now()
    
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Reservation denied'})

# Delete event from calendar (Admin only) - with notification to user
@app.route('/api/reservations/<int:id>/delete-event', methods=['POST'])
@login_required
def delete_event(id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    reservation = db.session.get(Reservation, id)
    if not reservation:
        return jsonify({'error': 'Reservation not found'}), 404
    
    data = request.get_json()
    reason = data.get('reason', 'No reason provided')
    
    # Mark as deleted (not denied) so users get notified
    reservation.status = 'deleted'
    reservation.denial_reason = reason
    reservation.archived_at = datetime.now()
    
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Event deleted and user notified'})

# Archive approved reservation - Admin and admin_phase1 can archive
@app.route('/api/reservations/<int:id>/archive', methods=['POST'])
@login_required
def archive_reservation(id):
    if current_user.role not in ['admin', 'admin_phase1']:
        return jsonify({'error': 'Admin access required'}), 403
    
    reservation = db.session.get(Reservation, id)
    if not reservation:
        return jsonify({'error': 'Reservation not found'}), 404
    
    # Only set archived_at, keep status as 'approved' so it stays on calendar
    reservation.archived_at = datetime.now()
    
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Reservation archived'})

# Delete reservation
@app.route('/api/reservations/<int:id>', methods=['DELETE'])
@login_required
def delete_reservation(id):
    reservation = db.session.get(Reservation, id)
    if not reservation:
        return jsonify({'error': 'Reservation not found'}), 404
    
    if current_user.role != 'admin' and reservation.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    db.session.delete(reservation)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Reservation deleted'})

# Get archived/denied reservations
@app.route('/api/archive', methods=['GET'])
@login_required
def get_archive():
    from sqlalchemy import or_
    if current_user.role in ['admin', 'admin_phase1']:
        # Include denied, deleted, or any reservation with archived_at set
        archived = Reservation.query.filter(
            or_(
                Reservation.status.in_(['denied', 'deleted']),
                Reservation.archived_at != None
            )
        ).all()
    else:
        archived = Reservation.query.filter_by(user_id=current_user.id).filter(
            or_(
                Reservation.status.in_(['denied', 'deleted']),
                Reservation.archived_at != None
            )
        ).all()
    
    archive_list = [{
        'id': r.id,
        'user_id': r.user_id,
        'user': _display_username(r.requester),
        'department': r.requester.department if r.requester else 'Unknown',
        'room_id': r.room_id,
        'activity_purpose': r.activity_purpose,
        'start_time': r.start_time.isoformat() if r.start_time else None,
        'end_time': r.end_time.isoformat() if r.end_time else None,
        'status': r.status,
        'denial_reason': r.denial_reason,
        'archived_at': r.archived_at.isoformat() if r.archived_at else None
    } for r in archived]
    
    return jsonify(archive_list)

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
        try:
            months = int(request.args.get('months', 6))
        except (TypeError, ValueError):
            months = 6

        payload = build_analytics_snapshot(
            months=months,
            department=department,
            heatmap_month=heatmap_month,
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
            'message': 'Model retrained using approved reservations only.',
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
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()

    if not username:
        return jsonify({'status': 'error', 'message': 'Username is required'}), 400

    existing = User.query.filter(User.username == username, User.id != current_user.id).first()
    if existing:
        return jsonify({'status': 'error', 'message': 'Username already taken'}), 409

    current_user.username = username
    db.session.commit()
    return jsonify({
        'status': 'success',
        'message': 'Profile updated',
        'user': {
            'id': current_user.id,
            'username': current_user.username,
            'role': current_user.role,
            'department': current_user.department
        }
    })


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
    """Resolve a local facility upload URL to an absolute file path, if safe and valid."""
    if not image_url:
        return None

    value = (image_url or '').strip()
    if not value:
        return None

    parsed = urlparse(value)
    url_path = (parsed.path or value).strip()
    prefix = '/static/uploads/'

    if not url_path.startswith(prefix):
        return None

    filename = os.path.basename(url_path)
    if not filename:
        return None

    uploads_dir = os.path.join(app.static_folder, 'uploads')
    return os.path.join(uploads_dir, filename)


def _delete_uploaded_facility_image(image_url):
    """Best-effort deletion of a previously uploaded facility image from /static/uploads."""
    filepath = _uploaded_facility_image_path(image_url)
    if not filepath:
        return

    try:
        if os.path.isfile(filepath):
            os.remove(filepath)
    except Exception as exc:
        app.logger.warning("Could not delete old facility image '%s': %s", filepath, exc)


@app.route('/api/admin/facilities', methods=['GET'])
@login_required
def admin_get_facilities():
    denied = _require_admin_settings_access()
    if denied:
        return denied

    rooms = Room.query.order_by(Room.name.asc()).all()
    return jsonify([
        {
            'id': room.id,
            'code': room.code,
            'name': room.name,
            'capacity': room.capacity,
            'description': room.description,
            'usual_activity': room.usual_activity,
            'detailed_info': room.detailed_info,
            'image_url': room.image_url
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

    if not name or capacity is None:
        return jsonify({'status': 'error', 'message': 'Name and capacity are required'}), 400

    if code and Room.query.filter_by(code=code).first():
        return jsonify({'status': 'error', 'message': 'Facility code already exists'}), 409

    room = Room(
        code=code,
        name=name,
        capacity=int(capacity),
        description=(data.get('description') or '').strip(),
        usual_activity=(data.get('usual_activity') or '').strip(),
        detailed_info=(data.get('detailed_info') or '').strip(),
        image_url=(data.get('image_url') or '').strip()
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

    uploads_dir = os.path.join(app.static_folder, 'uploads')
    os.makedirs(uploads_dir, exist_ok=True)

    filename = f"facility_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(uploads_dir, filename)
    image_file.save(filepath)

    # When user uploads a replacement, remove the prior local uploaded file.
    _delete_uploaded_facility_image(previous_image_url)

    return jsonify({'status': 'success', 'image_url': f'/static/uploads/{filename}'})


@app.route('/api/admin/facilities/<int:id>', methods=['DELETE'])
@login_required
def admin_delete_facility(id):
    denied = _require_admin_settings_access()
    if denied:
        return denied

    room = db.session.get(Room, id)
    if not room:
        return jsonify({'status': 'error', 'message': 'Facility not found'}), 404

    has_reservations = Reservation.query.filter_by(room_id=id).first()
    if has_reservations:
        return jsonify({'status': 'error', 'message': 'Cannot delete facility with existing reservations'}), 409

    _delete_uploaded_facility_image((room.image_url or '').strip())

    db.session.delete(room)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Facility deleted'})


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

    db.session.delete(user)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'User account deleted'})

if __name__ == '__main__':
    training_scheduler = start_training_scheduler(app)
    app.run(debug=True)
