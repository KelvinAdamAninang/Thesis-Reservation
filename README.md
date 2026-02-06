# VacanSee - Campus Space Reservation System

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- Windows, Mac, or Linux

### Step 1: Install Dependencies
```bash
cd python-scheduler-api
pip install -r requirements.txt
```

### Step 2: Initialize Database
```bash
python app.py
```

Then visit: **http://localhost:5000/setup**

This will create and seed the database with test data.

### Step 3: Start the Application
```bash
python app.py
```

Visit: **http://localhost:5000**

## 📋 Test Accounts

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Student | ccs | 1234 |
| Student | cas | 1234 |
| Student | eng | 1234 |

## ✨ Features Implemented

### ✅ Login/Logout
- Secure authentication using Flask-Login
- Session management with database persistence
- API endpoint: `POST /api/login` and `POST /api/logout`

### ✅ SQLite Database
- Automatic database initialization
- Tables: Users, Rooms, Reservations
- Relational foreign keys for data integrity

### ✅ Reservation Management
- Create new reservations with concept paper (Google Drive link)
- Track reservation status through workflow
- Upload final forms (Google Drive link) for approval
- View all user reservations

### ✅ Calendar System
- View all approved events
- Display event times and purposes
- Real-time updates

### ✅ Admin Approval Workflow
- **Stage 1**: Approve concept paper
- **Stage 2**: Approve final documentation
- View pending requests
- Deny requests with reason
- Analytics dashboard

### ✅ Frontend (React)
- No build tools required (uses CDN)
- Responsive design with Tailwind CSS
- Real-time data sync with backend
- Modal dialogs for all major actions

## 🔄 Complete Workflow Example

### As a Student:
1. Login with `ccs/1234`
2. Click "Facilities" to see available spaces
3. Click on a facility to book → fill form → provide Google Drive link for concept paper → submit
4. Check dashboard for approval status
5. When concept approved → provide Google Drive link for final form
6. Wait for final approval
7. View confirmed event in calendar

### As an Admin:
1. Login with `admin/admin123`
2. Go to "Requests" tab to see pending reservations
3. Review concept paper and details
4. Click "Approve Concept (Stage 1)"
5. When user uploads final form, review it
6. Click "Approve Reservation (Stage 2)"
7. View analytics and confirmed events

## 📁 Project Structure

```
python-scheduler-api/
├── app.py                    # Flask backend
├── models.py                 # Database models
├── requirements.txt          # Dependencies
├── START.bat                 # Windows startup script
├── start.sh                  # Linux/Mac startup script
│
├── templates/
│   ├── index.html           # Main HTML page
│   └── index-old.jsx        # Original React component (backup)
│
├── static/
│   ├── app.jsx              # Simplified React component
│   └── uploads/             # (Legacy folder - no longer used)
│
├── instance/
│   └── school.db            # SQLite database
└── __pycache__/             # Python cache
```

## 🔌 API Endpoints

### Authentication
- `POST /api/login` - Login user
- `POST /api/logout` - Logout user

### Rooms
- `GET /api/rooms` - Get all available spaces

### Reservations (User actions)
- `GET /api/reservations` - Get user's reservations
- `POST /api/reservations` - Create new reservation
- `POST /api/reservations/<id>/upload-final-form` - Upload final form

### Reservations (Admin only)
- `POST /api/reservations/<id>/approve-concept` - Approve Stage 1
- `POST /api/reservations/<id>/approve-final` - Approve Stage 2
- `POST /api/reservations/<id>/deny` - Deny with reason
- `DELETE /api/reservations/<id>` - Delete reservation

## 🗄️ Database Schema

### Users Table
```
id (PRIMARY KEY)
username (UNIQUE)
password_hash
role ('admin' or 'student')
department
```

### Rooms Table
```
id (PRIMARY KEY)
code (UNIQUE)
name
capacity
description
usual_activity
```

### Reservations Table
```
id (PRIMARY KEY)
user_id (FOREIGN KEY → Users)
room_id (FOREIGN KEY → Rooms)
activity_purpose
division
attendees
participant_type
participant_details
classification
person_in_charge
contact_number
start_time
end_time
status ('pending', 'concept-approved', 'approved', 'denied')
concept_paper_filename
final_form_filename
final_form_uploaded (BOOLEAN)
denial_reason
archived_at
date_filed
equipment_data (JSON)
```

## 🛠️ Technical Stack

- **Backend**: Flask 2.3.3
- **Database**: SQLite3
- **Frontend**: React 18 (CDN)
- **Styling**: Tailwind CSS
- **UI Icons**: Unicode/Emoji (no external dependencies)
- **Authentication**: Flask-Login
- **CORS**: Flask-CORS

## 🐛 Troubleshooting

### Issue: "Port 5000 already in use"
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (Windows - replace PID)
taskkill /PID <PID> /F

# Or change port in app.py
app.run(debug=True, port=5001)
```

### Issue: "Database is locked"
- Close all other connections
- Restart Flask server
- Check no other Python processes are using the DB

### Issue: "CORS error in browser"
- Ensure Flask-CORS is installed
- Check CORS configuration in app.py
- Verify backend and frontend origins match

### Issue: "Files not uploading"
- Check `static/uploads/` folder exists
- Verify file is PDF format
- Check file size < 10MB
- Ensure folder has write permissions

### Issue: "Can't find static files"
- Restart Flask server
- Clear browser cache (Ctrl+Shift+Delete)
- Check files are in `static/` folder

## 📊 Reservation Statuses

- **pending**: Awaiting admin review of concept
- **concept-approved**: Concept approved, waiting for final form
- **approved**: Fully approved, event confirmed
- **denied**: Rejected (can see denial reason)

## 🔐 Security Features

- Passwords hashed using Werkzeug
- Flask-Login session management
- CSRF protection via SECRET_KEY
- File type validation (PDF only)
- File size limit (10MB)
- Database relationships for data integrity

## 📝 Configuration

Edit these in `app.py`:
```python
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///school.db'
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB
```

Edit CORS origins:
```python
CORS(app, supports_credentials=True, 
     origins=['http://localhost:3000', 'http://localhost:5000'])
```

## 🎨 Customization

### Add New Fields to Reservations
Edit `models.py`:
```python
new_field = db.Column(db.String(100), nullable=True)
```

### Change Rooms
Edit the setup route in `app.py` to modify test data:
```python
rooms_list = [
    # Add your rooms here
]
```

### Modify Workflow
Change status values in reservation creation/approval logic in `app.py`

## 📞 Support

Check these when debugging:
1. **Frontend errors**: Browser console (F12)
2. **Backend errors**: Terminal output
3. **Database**: View with SQLite browser
   - Windows: Download DB Browser for SQLite
   - Linux: `sqlite3 instance/school.db`
   - Mac: `sqlite3 instance/school.db`

## 🎓 Learning Resources

The code demonstrates:
- Flask REST API design
- SQLAlchemy ORM patterns
- React hooks and state management
- Form handling and file uploads
- Authentication workflows
- Database migrations with Flask-Login

## 📦 Deployment

To deploy to production:

1. Set `debug=False` in app.py
2. Use production WSGI server (Gunicorn)
3. Set strong `SECRET_KEY`
4. Use PostgreSQL instead of SQLite
5. Set `SQLALCHEMY_DATABASE_URI` to production DB
6. Configure proper CORS origins
7. Enable HTTPS
8. Store uploads in cloud storage (S3, etc.)

## ✉️ Contact

For issues or improvements, check:
1. Browser console for frontend errors
2. Terminal for backend errors  
3. Database browser for data verification
