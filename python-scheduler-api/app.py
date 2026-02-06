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
            {'user': 'ccs', 'pass': '1234', 'role': 'student', 'dept': 'College of Computer Studies'},
            {'user': 'cas', 'pass': '1234', 'role': 'student', 'dept': 'College of Arts & Sciences'},
            {'user': 'eng', 'pass': '1234', 'role': 'student', 'dept': 'College of Engineering'},
            {'user': 'avi', 'pass': '1234', 'role': 'student', 'dept': 'College of Nursing'},
        ]
        
        for u in users_to_add:
            new_user = User(username=u['user'], role=u['role'], department=u['dept'])
            new_user.set_password(u['pass'])
            db.session.add(new_user)
            print(f" -> Added Account: {u['user']}")
        
        rooms_list = [
            {"code": "pat", "name": "Performing Arts Theatre", "cap": 1500, "desc": "A state-of-the-art facility designed for major university events, featuring professional lighting and sound systems."},
            {"code": "tvs", "name": "TV Studio", "cap": 50,"desc": "Equipped studio for media production."},
            {"code": "quad", "name": "Quadrangle", "cap": 3000, "desc": "The central open field, perfect for large-scale outdoor student gatherings and school-wide events."},
            {"code": "rdr", "name": "Radio Room", "cap": 15, "desc": "Soundproof booth for audio recordings."}
        ]
        
        for r in rooms_list:
            new_room = Room(
                code=r['code'],
                name=r['name'], 
                capacity=r['cap'], 
                description=r['desc']
            )
            db.session.add(new_room)
            print(f" -> Added Facility: {r['name']}")
        
        db.session.commit()
        return f"""
        <h1>Setup Complete! 🚀</h1>
        <p>Database has been wiped and re-seeded with:</p>
        <ul>
            <li>{len(users_to_add)} Users created</li>
            <li>{len(rooms_list)} Facilities added</li>
        </ul>
        <a href='/'>Go to Dashboard</a>
        """

# ==================== API ROUTES ====================

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

# Get single reservation
@app.route('/api/reservations/<int:reservation_id>', methods=['GET'])
@login_required
def get_reservation(reservation_id):
    reservation = Reservation.query.get_or_404(reservation_id)
    
    # Check permission
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

# Create reservation
@app.route('/api/reservations', methods=['POST'])
@login_required
def create_reservation():
    try:
        data = request.get_json()
        
        # Validate Google Drive link
        concept_paper_url = data.get('concept_paper_url', '').strip()
        if not concept_paper_url:
            return jsonify({'error': 'Concept paper Google Drive link required'}), 400
        
        if 'drive.google.com' not in concept_paper_url:
            return jsonify({'error': 'Please provide a valid Google Drive link'}), 400
        
        # Parse datetime
        start_datetime = datetime.fromisoformat(data.get('start_time'))
        end_datetime = datetime.fromisoformat(data.get('end_time'))
        
        # Create reservation
        new_reservation = Reservation(
            user_id=current_user.id,
            room_id=int(data.get('room_id')),
            activity_purpose=data.get('activity_purpose'),
            division=data.get('division'),
            attendees=int(data.get('attendees', 0)),
            participant_type=data.get('participant_type'),
            participant_details=data.get('participant_details'),
            classification=data.get('classification'),
            person_in_charge=data.get('person_in_charge'),
            contact_number=data.get('contact_number'),
            start_time=start_datetime,
            end_time=end_datetime,
            status='pending',
            concept_paper_url=concept_paper_url,
            equipment_data=data.get('equipment_data', '{}')
        )
        
        db.session.add(new_reservation)
        db.session.commit()
        
        return jsonify({'status': 'success', 'id': new_reservation.id})
    
    except Exception as e:
        db.session.rollback()
        print(f"Error creating reservation: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Update reservation
@app.route('/api/reservations/<int:reservation_id>', methods=['PUT'])
@login_required
def update_reservation(reservation_id):
    reservation = Reservation.query.get_or_404(reservation_id)
    
    # Check permission
    if current_user.role != 'admin' and reservation.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    try:
        data = request.get_json()
        
        # Update fields
        if 'activity_purpose' in data:
            reservation.activity_purpose = data['activity_purpose']
        if 'division' in data:
            reservation.division = data['division']
        if 'attendees' in data:
            reservation.attendees = data['attendees']
        if 'participant_type' in data:
            reservation.participant_type = data['participant_type']
        if 'participant_details' in data:
            reservation.participant_details = data['participant_details']
        if 'classification' in data:
            reservation.classification = data['classification']
        if 'person_in_charge' in data:
            reservation.person_in_charge = data['person_in_charge']
        if 'contact_number' in data:
            reservation.contact_number = data['contact_number']
        if 'start_time' in data:
            reservation.start_time = datetime.fromisoformat(data['start_time'])
        if 'end_time' in data:
            reservation.end_time = datetime.fromisoformat(data['end_time'])
        if 'room_id' in data:
            reservation.room_id = data['room_id']
        if 'equipment_data' in data:
            reservation.equipment_data = data['equipment_data']
        
        db.session.commit()
        return jsonify({'status': 'success'})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Admin: Approve concept (Stage 1)
@app.route('/api/reservations/<int:reservation_id>/approve-concept', methods=['POST'])
@login_required
def approve_concept(reservation_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    reservation = Reservation.query.get_or_404(reservation_id)
    reservation.status = 'concept-approved'
    db.session.commit()
    
    return jsonify({'status': 'success'})

# Admin: Final approval (Stage 2)
@app.route('/api/reservations/<int:reservation_id>/approve-final', methods=['POST'])
@login_required
def approve_final(reservation_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    reservation = Reservation.query.get_or_404(reservation_id)
    
    if not reservation.final_form_uploaded:
        return jsonify({'error': 'Final form not uploaded'}), 400
    
    reservation.status = 'approved'
    db.session.commit()
    
    return jsonify({'status': 'success'})

# Admin: Deny reservation
@app.route('/api/reservations/<int:reservation_id>/deny', methods=['POST'])
@login_required
def deny_reservation(reservation_id):
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    reason = data.get('reason', '')
    
    if not reason:
        return jsonify({'error': 'Denial reason required'}), 400
    
    reservation = Reservation.query.get_or_404(reservation_id)
    reservation.status = 'denied'
    reservation.denial_reason = reason
    db.session.commit()
    
    return jsonify({'status': 'success'})

# User: Upload final form (Stage 2)
@app.route('/api/reservations/<int:reservation_id>/upload-final-form', methods=['POST'])
@login_required
def upload_final_form(reservation_id):
    reservation = Reservation.query.get_or_404(reservation_id)
    
    # Check permission
    if reservation.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    if reservation.status != 'concept-approved':
        return jsonify({'error': 'Concept not yet approved'}), 400
    
    # Validate Google Drive link
    data = request.get_json()
    final_form_url = data.get('final_form_url', '').strip()
    if not final_form_url:
        return jsonify({'error': 'Final form Google Drive link required'}), 400
    
    if 'drive.google.com' not in final_form_url:
        return jsonify({'error': 'Please provide a valid Google Drive link'}), 400
    
    reservation.final_form_url = final_form_url
    reservation.final_form_uploaded = True
    db.session.commit()
    
    return jsonify({'status': 'success'})

# Archive reservation
@app.route('/api/reservations/<int:reservation_id>/archive', methods=['POST'])
@login_required
def archive_reservation(reservation_id):
    reservation = Reservation.query.get_or_404(reservation_id)
    
    # Check permission
    if current_user.role != 'admin' and reservation.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    reservation.archived_at = datetime.now()
    db.session.commit()
    
    return jsonify({'status': 'success'})

# Delete reservation
@app.route('/api/reservations/<int:reservation_id>', methods=['DELETE'])
@login_required
def delete_reservation(reservation_id):
    reservation = Reservation.query.get_or_404(reservation_id)
    
    # Check permission
    if current_user.role != 'admin' and reservation.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Delete database record (no files to clean up since using Google Drive links)
    db.session.delete(reservation)
    db.session.commit()
    
    return jsonify({'status': 'success'})

# Gemini AI Proxy
@app.route('/api/gemini', methods=['POST'])
@login_required
def gemini_proxy():
    try:
        data = request.get_json()
        prompt = data.get('prompt', '')
        
        if not prompt:
            return jsonify({'error': 'Prompt required'}), 400
        
        # Get context data
        rooms = Room.query.all()
        approved_reservations = Reservation.query.filter_by(status='approved').all()
        
        context = {
            'facilities': [{
                'id': r.id,
                'code': r.code,
                'name': r.name,
                'capacity': r.capacity,
                'usual_activity': r.usual_activity,
                'description': r.description
            } for r in rooms],
            'approved_schedule': [{
                'id': r.id,
                'room_id': r.room_id,
                'activity': r.activity_purpose,
                'date': r.start_time.date().isoformat() if r.start_time else None,
                'start_time': r.start_time.time().isoformat() if r.start_time else None,
                'end_time': r.end_time.time().isoformat() if r.end_time else None
            } for r in approved_reservations]
        }
        
        system_instruction = """
You are VacanSee, the official Campus Event Space Reservation Assistant.
Your only purpose is to help users and administrators with questions strictly related to campus facilities and the reservation process as defined by the system.

You MUST follow these rules:

1. Answer only based on the valid JSON context provided.
   Only give information about:
   - facility availability
   - capacity
   - location
   - allowed activities
   - reservation steps
   - document requirements
   - approval status

2. Do NOT answer any question outside campus facilities and reservations.
   If the user asks about unrelated topics (e.g., cooking, history, math, coding, celebrity gossip), politely decline with:
   "I am only programmed to assist with campus facility reservations. Please ask me about room availability or the reservation process."

3. Maintain a helpful, concise, and professional tone.
   Give step-by-step guidance only when necessary.
   Avoid assumptions or adding information outside the provided JSON data.

4. Always follow the official VacanSee digital reservation workflow.
   If the user asks how to reserve a space, describe the process exactly as defined:
   Upload concept paper → EMC initial approval → Download/print form → Collect physical signatures → Upload signed form → Final EMC approval/decline.

5. Special rule for Concept Paper questions:
   If the user asks "How do I get a concept paper?" or similar, respond exactly:
   "You must first speak with the facility coordinator responsible for the venue you want to reserve. The coordinator will explain the required details for the concept paper. After drafting the concept paper, you must have it signed by the Chancellor. Only the Concept Paper signed by the Chancellor can be uploaded to VacanSee for EMC's initial review."

6. Never invent approval steps, signatures, or requirements not present in the JSON context.
   If a required item is missing from the JSON, tell the user you cannot confirm it and ask them to contact the facility coordinator or EMC office.

END OF SYSTEM INSTRUCTION.
"""
        
        user_query = f"""
The current date/time is {datetime.now().isoformat()}.
Here is the current application state:
{json.dumps(context, indent=2)}

The user asks: {prompt}
"""
        
        # Call Gemini API
        response = requests.post(
            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            json={
                'contents': [{'parts': [{'text': user_query}]}],
                'systemInstruction': {'parts': [{'text': system_instruction}]}
            },
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.ok:
            result = response.json()
            ai_response = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', 'No response')
            return jsonify({'response': ai_response})
        else:
            return jsonify({'error': 'AI service error', 'details': response.text}), 500
    
    except Exception as e:
        print(f"Gemini API error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)