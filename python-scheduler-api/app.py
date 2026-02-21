import os
import json
import requests
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_cors import CORS
from datetime import datetime
from models import db, User, Room, Reservation 

app = Flask(__name__)

# Enable CORS
CORS(app, supports_credentials=True, origins=[
    'http://localhost:3000', 'http://localhost:5000',
    'http://127.0.0.1:3000', 'http://127.0.0.1:5000'
])

# CONFIG
app.config['SECRET_KEY'] = 'thesis-secret-key-123'

# Ensure instance directory exists and use an absolute DB path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INSTANCE_DIR = os.path.join(BASE_DIR, 'instance')
os.makedirs(INSTANCE_DIR, exist_ok=True)
DB_PATH = os.path.join(INSTANCE_DIR, 'school.db')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + DB_PATH.replace('\\', '/')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# AI CONFIG (Gemini API)
GEMINI_API_KEY = ""
GEMINI_URL = ""

# Initialize extensions
db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

# Create tables
with app.app_context():
    db.create_all()


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
            {'user': 'eng', 'pass': '1234', 'role': 'student', 'dept': 'College of Engineering'},
            {'user': 'avi', 'pass': '1234', 'role': 'student', 'dept': 'College of Nursing'},
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
        'usual_activity': room.usual_activity
    } for room in rooms]
    return jsonify(rooms_list)

# Get all approved calendar events (visible to all logged-in users)
@app.route('/api/calendar-events', methods=['GET'])
@login_required
def get_calendar_events():
    # Return all approved, non-archived reservations for the calendar
    reservations = Reservation.query.filter_by(status='approved').filter(Reservation.archived_at == None).all()
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

# Get all reservations (Admin sees all, users see their own)
@app.route('/api/reservations', methods=['GET'])
@login_required
def get_reservations():
    if current_user.role == 'admin':
        reservations = Reservation.query.all()
    else:
        reservations = Reservation.query.filter_by(user_id=current_user.id).all()
    
    reservations_list = [{
        'id': r.id,
        'user_id': r.user_id,
        'user': r.requester.username if r.requester else 'Unknown',
        'department': r.requester.department if r.requester else 'Unknown',
        'room_id': r.room_id,
        'activity_purpose': r.activity_purpose,
        'division': r.division,
        'attendees': r.attendees,
        'participant_type': r.participant_type,
        'participant_details': r.participant_details,
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
        'user': reservation.requester.username if reservation.requester else 'Unknown',
        'department': reservation.requester.department if reservation.requester else 'Unknown',
        'room_id': reservation.room_id,
        'activity_purpose': reservation.activity_purpose,
        'division': reservation.division,
        'attendees': reservation.attendees,
        'participant_type': reservation.participant_type,
        'participant_details': reservation.participant_details,
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
            participant_type=data.get('participant_type', ''),
            participant_details=data.get('participant_details', ''),
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

# Deny reservation - Admin only
@app.route('/api/reservations/<int:id>/deny', methods=['POST'])
@login_required
def deny_reservation(id):
    if current_user.role != 'admin':
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
    if current_user.role == 'admin':
        archived = Reservation.query.filter(Reservation.status.in_(['denied', 'deleted'])).all()
    else:
        archived = Reservation.query.filter_by(user_id=current_user.id).filter(Reservation.status.in_(['denied', 'deleted'])).all()
    
    archive_list = [{
        'id': r.id,
        'user_id': r.user_id,
        'user': r.requester.username if r.requester else 'Unknown',
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
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    total = Reservation.query.count()
    pending = Reservation.query.filter_by(status='pending').count()
    concept_approved = Reservation.query.filter_by(status='concept-approved').count()
    approved = Reservation.query.filter_by(status='approved').count()
    denied = Reservation.query.filter_by(status='denied').count()
    
    return jsonify({
        'total': total,
        'pending': pending,
        'concept_approved': concept_approved,
        'approved': approved,
        'denied': denied
    })

if __name__ == '__main__':
    app.run(debug=True)
