"""
Script to seed reservations into the database.
Run this script from the python-scheduler-api directory.
"""
import os
import sys
import random
from datetime import datetime, timedelta

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

BED_DIVISIONS = [
    "SHS",
    "Junior High School",
    "Grade School"
]

CLASSIFICATIONS = [
    "Institutional", "Curricular", "Outside Group",
    "Co-Curricular", "Extra-Curricular"
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

# Status distribution for the current workflow, including deleted records for archive/status analytics.
STATUS_WEIGHTS = (
    ['approved'] * 35 +
    ['pending'] * 30 +
    ['concept-approved'] * 18 +
    ['denied'] * 12 +
    ['deleted'] * 5
)


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


def generate_drive_url(prefix, index):
    """Generate a stable-looking Google Drive URL for seeded records."""
    return f"https://drive.google.com/file/d/{prefix}_{index:03d}/view"


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


def get_division_for_user(user):
    """Return a division based on the account's department rules."""
    department = (user.department or '').strip()
    department_key = department.lower()

    # BED accounts should use BED-specific divisions.
    if department_key in {'bed', 'basic education department'}:
        return random.choice(BED_DIVISIONS)

    # EMC/admin accounts can have random external-style divisions.
    if user.role in {'admin', 'admin_phase1'} or department_key in {'emc', 'event management center'}:
        return random.choice(DIVISIONS)

    # Other departments should follow their own department name.
    if department:
        return department

    return random.choice(DIVISIONS)


def seed_reservations(count=220):
    """Seed the database with sample reservations."""
    with app.app_context():
        # Get existing users and rooms
        users = User.query.filter(User.username != 'deleted_account').all()
        rooms = Room.query.all()
        
        if not users:
            print("Error: No active users found. Please run /setup first.")
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
            
            # Date filed: always before the event start so lead-time analytics remain valid.
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
                'division': get_division_for_user(user),
                'attendees': random.randint(10, min(500, room.capacity)),
                'classification': random.choice(CLASSIFICATIONS),
                'person_in_charge': random.choice(PERSON_NAMES),
                'contact_number': generate_contact_number(),
                'start_time': start_time,
                'end_time': end_time,
                'date_filed': date_filed,
                'status': status,
                'concept_paper_url': generate_drive_url('concept', i + 1),
                'final_form_url': '',
                'final_form_uploaded': False,
            }

            if status == 'approved':
                reservation_data['final_form_url'] = generate_drive_url('final', i + 1)
                reservation_data['final_form_uploaded'] = True
            elif status == 'concept-approved' and random.random() < 0.45:
                reservation_data['final_form_url'] = generate_drive_url('final-pending', i + 1)
                reservation_data['final_form_uploaded'] = True
            
            # Add denial/deletion reason and archive timestamp where applicable.
            if status in ['denied', 'deleted']:
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
            elif status == 'approved' and start_time < today and random.random() < 0.35:
                reservation_data['archived_at'] = end_time + timedelta(days=random.randint(1, 10))
            
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
        
        print(f"\nSuccessfully created {reservations_created} reservations.")
        
        # Print summary
        print("\nReservation Summary:")
        for status in ['pending', 'concept-approved', 'approved', 'denied', 'deleted']:
            count_status = Reservation.query.filter_by(status=status).count()
            print(f"   - {status}: {count_status}")
        
        total = Reservation.query.count()
        print(f"\n   Total reservations in database: {total}")


if __name__ == '__main__':
    count = 220
    if len(sys.argv) > 1:
        try:
            count = max(200, int(sys.argv[1]))
        except ValueError:
            print('Invalid reservation count argument. Using default 220.')
    print(f"Seeding {count} reservations into the database...\n")
    seed_reservations(count)
    print("\nDone. Start the Flask app to see the reservations.")
