 # VacanSee - Campus Space Reservation System

A Flask backend with React frontend for managing campus event space reservations with SQLite database, login/logout functionality, and admin approval workflows.

## Quick Start

### 1. Install Dependencies

```bash
cd python-scheduler-api
pip install -r requirements.txt
```

### 2. Initialize the Database

```bash
python app.py
```

Then visit http://localhost:5000/setup to seed the database with default users and facilities.

### 3. Start the Server

```bash
python app.py
```

The app will be available at http://localhost:5000

### 4. Login Credentials

**Admin Account:**
- Username: `admin`
- Password: `admin123`

**Student Accounts:**
- Username: `ccs` / Password: `1234`
- Username: `cas` / Password: `1234`
- Username: `eng` / Password: `1234`
- Username: `avi` / Password: `1234`

## Features

### User Features
- **Login/Logout** - Secure authentication with Flask-Login
- **Create Reservations** - Submit space reservation requests with concept papers
- **Upload Final Forms** - Upload documentation after concept approval
- **View Status** - Track reservation status (pending → concept-approved → approved)
- **Calendar View** - See all approved events
- **Archive** - View and manage past reservations

### Admin Features
- **Manage Requests** - Review pending reservation requests
- **Two-Stage Approval**:
  - Stage 1: Approve concept paper
  - Stage 2: Approve final documentation
- **Deny Requests** - Reject reservations with reason
- **Analytics** - View reservation statistics
- **Manage Facilities** - Manage available spaces

## Database Structure

### Users Table
- `id` - Primary key
- `username` - Unique username
- `password_hash` - Hashed password
- `role` - 'admin' or 'student'
- `department` - User's department

### Rooms Table
- `id` - Primary key
- `code` - Room code
- `name` - Room name
- `capacity` - Room capacity
- `description` - Room description
- `usual_activity` - Typical activities

### Reservations Table
- `id` - Primary key
- `user_id` - Requester (FK to Users)
- `room_id` - Requested room (FK to Rooms)
- `activity_purpose` - Event purpose
- `division` - Organizing division
- `attendees` - Expected attendees
- `person_in_charge` - Main contact
- `contact_number` - Contact phone
- `start_time` - Event start datetime
- `end_time` - Event end datetime
- `status` - 'pending', 'concept-approved', 'approved', or 'denied'
- `concept_paper_filename` - Initial document
- `final_form_filename` - Final documentation
- `denial_reason` - Rejection reason (if denied)
- `archived_at` - Archival timestamp (if archived)
- `date_filed` - Request submission time

## API Endpoints

### Authentication
- `POST /api/login` - Login with credentials
- `POST /api/logout` - Logout user

### Rooms
- `GET /api/rooms` - Get all available rooms

### Reservations
- `GET /api/reservations` - Get user's reservations (admin sees all)
- `POST /api/reservations` - Create new reservation
- `PUT /api/reservations/<id>` - Update reservation
- `DELETE /api/reservations/<id>` - Delete reservation
- `POST /api/reservations/<id>/approve-concept` - [ADMIN] Approve Stage 1
- `POST /api/reservations/<id>/upload-final-form` - [USER] Upload final form
- `POST /api/reservations/<id>/approve-final` - [ADMIN] Approve Stage 2
- `POST /api/reservations/<id>/deny` - [ADMIN] Deny reservation
- `POST /api/reservations/<id>/archive` - Archive reservation

## File Structure

```
python-scheduler-api/
├── app.py                 # Flask backend
├── models.py              # Database models
├── requirements.txt       # Python dependencies
├── templates/
│   ├── index.html         # Main React page
│   └── index.jsx          # React component (backup)
├── static/
│   ├── app.jsx            # React component
│   └── uploads/           # (Legacy folder - no longer used)
├── instance/              # SQLite database
└── school.db              # Database file
```

## Workflow

### Student Perspective
1. Login to account
2. Click "Facilities" or use Dashboard to book a space
3. Fill in reservation form with details
4. Provide Google Drive link to concept paper
5. Submit reservation
6. Wait for admin to approve concept (Stage 1)
7. Admin approves concept → receive notification
8. Prepare final form document and upload to Google Drive
9. Provide Google Drive link to final form
10. Wait for admin final approval (Stage 2)
11. Reservation approved! Event confirmed

### Admin Perspective
1. Login to admin account
2. Go to "Requests" to see all pending requests
3. Review concept paper and details
4. Approve concept (Stage 1) or deny with reason
5. Once user uploads final form, review it
6. Approve reservation (Stage 2) or deny with reason
7. View analytics in "Analytics" tab
8. Access approved events in "Event Calendar"

## Configuration

Edit `app.py` to modify:
- `SECRET_KEY` - Flask session secret
- `SQLALCHEMY_DATABASE_URI` - Database URL (default: SQLite)
- `CORS` - Allowed origins for API calls
- All concept paper and final form submissions now use Google Drive links (no file uploads)

## Troubleshooting

**Issue: "Login failed" error**
- Ensure database is initialized with `/setup` route
- Check username and password match database

**Issue: Files not uploading**
- Google Drive links must contain "drive.google.com"
- Ensure the link is shareable
- Verify the link format is valid

**Issue: CORS errors in browser console**
- Ensure Flask-CORS is installed
- Verify frontend and backend origins in CORS config

**Issue: Database lock errors**
- Close other connections to SQLite database
- Restart Flask server

## Future Enhancements

- Email notifications for approvals/denials
- Calendar integration (Google Calendar, Outlook)
- AI assistant for facility recommendations
- Document preview from Google Drive links
- Equipment rental tracking
- Recurring event support
- Mobile app

## Support

For issues or questions, check:
1. Browser console for frontend errors
2. Terminal output for backend errors
3. Database in `instance/school.db` using SQLite browser
