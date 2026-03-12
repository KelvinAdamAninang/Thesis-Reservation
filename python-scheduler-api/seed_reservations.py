"""
Script to seed 100 reservations into the database.
Run this script from the python-scheduler-api directory.
"""
import os
import sys
import random
from datetime import datetime, timedelta
import json

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from models import db, User, Room, Reservation

# Create minimal Flask app for database access
app = Flask(__name__)

# Database configuration (same as app.py)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INSTANCE_DIR = os.path.join(BASE_DIR, 'instance')
os.makedirs(INSTANCE_DIR, exist_ok=True)
DB_PATH = os.path.join(INSTANCE_DIR, 'school.db')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + DB_PATH.replace('\\', '/')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Sample data for realistic reservations
ACTIVITY_PURPOSES = [
    "Department Meeting", "Student Council Assembly", "Faculty Training",
    "Academic Conference", "Workshop on Research Methods", "Thesis Defense",
    "Club General Assembly", "Career Fair Setup", "Alumni Homecoming",
    "Student Orientation", "Leadership Training", "Cultural Night Rehearsal",
    "Sports Awards Ceremony", "Academic Competition", "Guest Lecture Series",
    "Department Seminar", "Staff Development Session", "Graduation Practice",
    "Art Exhibition Setup", "Music Recital", "Dance Performance",
    "Film Screening", "Debate Competition", "Science Fair",
    "Job Interview Sessions", "Parent-Teacher Conference", "Board Meeting",
    "Accreditation Review", "Community Outreach Program", "Blood Donation Drive",
    "Health Awareness Seminar", "Environmental Campaign", "Tech Summit",
    "Entrepreneurship Workshop", "Language Proficiency Testing", "Book Launch",
    "Photography Workshop", "Video Production Session", "Podcast Recording",
    "Radio Show Live", "TV Program Taping", "Press Conference",
    "Student Government Election", "Club Fair", "Welcome Party",
    "Farewell Celebration", "Recognition Ceremony", "Awarding Event",
    "Team Building Activity", "Strategic Planning Session"
]

DIVISIONS = [
    "Student Affairs", "Academic Affairs", "Administration", 
    "Research and Extension", "External Relations", "Finance",
    "Human Resources", "IT Services", "Library Services"
]

PARTICIPANT_TYPES = [
    "Students Only", "Faculty Only", "Staff Only", 
    "Mixed (Students & Faculty)", "External Guests", "General Public"
]

CLASSIFICATIONS = [
    "Academic", "Co-curricular", "Extra-curricular", 
    "Administrative", "Community Service", "Social"
]

PERSON_NAMES = [
    "Dr. Maria Santos", "Prof. Juan Dela Cruz", "Engr. Pedro Reyes",
    "Ms. Ana Garcia", "Mr. Carlos Lopez", "Dr. Rosa Martinez",
    "Atty. Miguel Fernandez", "Prof. Elena Ramirez", "Dr. Jose Aquino",
    "Ms. Sofia Mendoza", "Mr. Antonio Cruz", "Dr. Patricia Villanueva",
    "Prof. Ricardo Tan", "Ms. Cristina Lim", "Mr. Fernando Sy"
]

EQUIPMENT_OPTIONS = {
    'Performing Arts Theatre': [
        'Tables', 'Chairs', 'Philippine Flag', 'University Flag', 'TV', 
        'Still Camera', 'Video Camera', 'Sound System', 'Microphone', 
        'Speaker', 'Lights Set-Up', 'Podium'
    ],
    'Quadrangle': [
        'Tables', 'Chairs', 'Philippine Flag', 'University Flag', 
        'Still Camera', 'Video Camera', 'Sound System', 'Microphone', 
        'Speaker', 'Lights Set-Up'
    ],
    'Radio Room': [
        'Tables', 'Chairs', 'LCD Projector', 'White Screen', 'Still Camera',
        'Video Camera', 'Sound System', 'Microphone', 'Speaker'
    ],
    'TV Studio': [
        'Tables', 'Chairs', 'LCD Projector', 'White Screen', 'TV', 'Still Camera',
        'Video Camera', 'Sound System', 'Microphone', 'Speaker'
    ]
}

# Status distribution: 40% approved, 30% pending, 15% concept-approved, 15% denied
STATUS_WEIGHTS = ['approved'] * 40 + ['pending'] * 30 + ['concept-approved'] * 15 + ['denied'] * 15


def generate_contact_number():
    """Generate a random Philippine mobile number."""
    prefixes = ['0917', '0918', '0919', '0920', '0921', '0927', '0928', '0929', '0930', '0938', '0939', '0947', '0949', '0951', '0961', '0966', '0977', '0995', '0996', '0997']
    return f"{random.choice(prefixes)}{random.randint(1000000, 9999999)}"


def generate_equipment(room_name):
    """Generate random equipment selection for a room."""
    if room_name not in EQUIPMENT_OPTIONS:
        return {}
    
    equipment = {}
    available = EQUIPMENT_OPTIONS[room_name]
    # Select 2-6 random equipment items
    selected = random.sample(available, random.randint(2, min(6, len(available))))
    for item in selected:
        equipment[item] = random.randint(1, 10)
    return equipment


def generate_random_datetime(start_date, end_date):
    """Generate a random datetime between start_date and end_date."""
    delta = end_date - start_date
    random_days = random.randint(0, delta.days)
    random_date = start_date + timedelta(days=random_days)
    
    # Random hour between 6 AM and 8 PM
    hour = random.randint(6, 20)
    # Only 00 or 30 minutes
    minute = random.choice([0, 30])
    
    return random_date.replace(hour=hour, minute=minute, second=0, microsecond=0)


def seed_reservations(count=100):
    """Seed the database with sample reservations."""
    with app.app_context():
        # Get existing users and rooms
        users = User.query.filter(User.role != 'admin').all()
        rooms = Room.query.all()
        
        if not users:
            print("Error: No non-admin users found. Please run /setup first.")
            return
        
        if not rooms:
            print("Error: No rooms found. Please run /setup first.")
            return
        
        print(f"Found {len(users)} users and {len(rooms)} rooms.")
        print(f"Users: {[u.username for u in users]}")
        print(f"Rooms: {[r.name for r in rooms]}")
        
        # Date range: past 6 months to next 6 months
        today = datetime.now()
        start_date = today - timedelta(days=180)
        end_date = today + timedelta(days=180)
        
        reservations_created = 0
        
        for i in range(count):
            user = random.choice(users)
            room = random.choice(rooms)
            status = random.choice(STATUS_WEIGHTS)
            
            # Generate start time
            start_time = generate_random_datetime(start_date, end_date)
            
            # Event duration: 1-4 hours
            duration_hours = random.randint(1, 4)
            end_time = start_time + timedelta(hours=duration_hours)
            
            # Date filed: before start_time (for future events) or random past date
            if start_time > today:
                days_before = random.randint(7, 60)
                date_filed = start_time - timedelta(days=days_before)
            else:
                days_before = random.randint(7, 30)
                date_filed = start_time - timedelta(days=days_before)
            
            # Generate equipment
            equipment = generate_equipment(room.name)
            
            # Prepare reservation data
            reservation_data = {
                'user_id': user.id,
                'room_id': room.id,
                'activity_purpose': random.choice(ACTIVITY_PURPOSES),
                'division': random.choice(DIVISIONS),
                'attendees': random.randint(10, min(500, room.capacity)),
                'participant_type': random.choice(PARTICIPANT_TYPES),
                'participant_details': f"Approximately {random.randint(10, 100)} participants expected",
                'classification': random.choice(CLASSIFICATIONS),
                'person_in_charge': random.choice(PERSON_NAMES),
                'contact_number': generate_contact_number(),
                'start_time': start_time,
                'end_time': end_time,
                'date_filed': date_filed,
                'status': status,
                'concept_paper_url': f"https://drive.google.com/file/d/sample_{i+1}/view" if status != 'pending' else "",
                'final_form_url': f"https://drive.google.com/file/d/final_{i+1}/view" if status == 'approved' else "",
                'final_form_uploaded': status == 'approved',
            }
            
            # Add denial reason for denied reservations
            if status == 'denied':
                denial_reasons = [
                    "Schedule conflict with another approved event.",
                    "Incomplete documentation submitted.",
                    "Facility maintenance scheduled during requested time.",
                    "Insufficient lead time for event preparation.",
                    "Event does not align with university guidelines.",
                    "Capacity exceeded for the selected venue."
                ]
                reservation_data['denial_reason'] = random.choice(denial_reasons)
                reservation_data['archived_at'] = date_filed + timedelta(days=random.randint(1, 5))
            
            # Create reservation
            reservation = Reservation(**reservation_data)
            
            # Set equipment
            if equipment:
                reservation.set_equipment(equipment)
            
            db.session.add(reservation)
            reservations_created += 1
            
            if (i + 1) % 10 == 0:
                print(f"Created {i + 1} reservations...")
        
        # Commit all reservations
        db.session.commit()
        
        print(f"\n✅ Successfully created {reservations_created} reservations!")
        
        # Print summary
        print("\n📊 Reservation Summary:")
        for status in ['pending', 'concept-approved', 'approved', 'denied']:
            count_status = Reservation.query.filter_by(status=status).count()
            print(f"   - {status}: {count_status}")
        
        total = Reservation.query.count()
        print(f"\n   Total reservations in database: {total}")


if __name__ == '__main__':
    print("🚀 Seeding 100 reservations into the database...\n")
    seed_reservations(100)
    print("\n🎉 Done! Start the Flask app to see the reservations.")
