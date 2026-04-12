# VacanSee - Campus Space Reservation System

VacanSee is a Flask + React reservation platform for campus facilities, with a 2-stage approval workflow, calendar visualization, analytics, and AI assistant support.

## Overview

VacanSee supports:
- Stage 1 concept review and Stage 2 final review approval flow
- Facility booking with conflict checking and holiday blocking
- Calendar states for plotting, ongoing, and cancelled events
- Admin user and facility management
- Data-mining analytics and SARIMAX forecasting pipeline
- AI assistant integration for reservation guidance

## Current Workflow

### Stage 1
- Student submits reservation details and Concept Paper Google Drive link.
- Admin or Phase 1 Admin reviews and approves concept.
- Status becomes concept-approved.

### Stage 2
- Student submits Final Form Google Drive link.
- Full Admin performs final review.
- If approved, status becomes approved.

### Automatic Stage 2 Timeout
- Reservations in concept-approved are auto-cancelled if no final form is submitted within 5 days.
- The check runs automatically on a daily scheduler.

## Project Structure

```text
Thesis-Reservation/
├── README.md
├── requirements.txt
├── python-scheduler-api/
│   ├── app.py
│   ├── models.py
│   ├── requirements.txt
│   ├── scheduler.py
│   ├── data_mining/
│   │   ├── analytics.py
│   │   ├── forecast_utils.py
│   │   ├── train_sarimax_model.py
│   │   ├── seed_supabase.py
│   │   └── EMC_Cleaned_Records.csv
│   ├── templates/
│   │   ├── index.html
│   │   ├── app.jsx
│   │   └── header2.png
│   ├── static/
│   └── instance/
└── instance/
```

## Setup

### Prerequisites
- Python 3.10+
- A PostgreSQL database (Supabase recommended)

### Install
```bash
cd python-scheduler-api
pip install -r requirements.txt
```

### Environment
Create or update [python-scheduler-api/.env](python-scheduler-api/.env):

```env
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
GEMINI_API_KEY=<your_key_here>
GEMINI_MODEL=gemini-2.0-flash
```

### Run (Local Dev)
```bash
cd python-scheduler-api
python app.py
```

Open http://localhost:5000

### Run (Production via Gunicorn)
```bash
cd python-scheduler-api
gunicorn --bind 0.0.0.0:$PORT app:app
```

For Render, this repository includes a root `Procfile` that starts Gunicorn automatically.

## Test Accounts

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Admin Phase 1 | admin_phase1 | phase1 |
| Student | ccs | 1234 |
| Student | cas | 1234 |
| Student | eng | 1234 |

## Calendar Status Logic

- Plotting (gray):
  - concept-approved reservations
  - approved reservations not currently in active event window
- Ongoing (green):
  - approved reservations whose current time is within start and end
- Cancelled (yellow):
  - cancelled, deleted, or denied events

## Key API Endpoints

### Auth
- POST /api/login
- POST /api/logout

### Reservations
- GET /api/reservations
- POST /api/reservations
- GET /api/reservations/<id>
- POST /api/reservations/<id>/approve-concept
- POST /api/reservations/<id>/upload-final-form
- POST /api/reservations/<id>/approve-final
- POST /api/reservations/<id>/deny
- POST /api/reservations/<id>/delete-event
- POST /api/reservations/<id>/archive
- DELETE /api/reservations/<id>

### Calendar and Facilities
- GET /api/calendar-events
- GET /api/rooms

### Admin
- GET /api/admin/users
- POST /api/admin/users
- PUT /api/admin/users/<id>
- DELETE /api/admin/users/<id>
- POST /api/admin/facilities
- PUT /api/admin/facilities/<id>
- DELETE /api/admin/facilities/<id>

### AI Assistant
- POST /api/ai/chat

## AI Assistant Notes

The assistant is constrained by a strict VacanSee system instruction in [python-scheduler-api/app.py](python-scheduler-api/app.py).

Expected behavior:
- Answers only reservation and facility-related questions
- Follows official 2-stage workflow wording
- Uses required refusal text for unrelated questions

If Gemini quota is exhausted, backend returns a graceful fallback reply instead of raw traceback.

## Data Seeding

Seed historical records from the EMC cleaned CSV:

```bash
cd python-scheduler-api/data_mining
python seed_supabase.py --dry-run
python seed_supabase.py
```

Notes:
- [python-scheduler-api/data_mining/seed_supabase.py](python-scheduler-api/data_mining/seed_supabase.py) resolves imports from python-scheduler-api so it can find app and models correctly.
- Dry run prints transformed rows without writing to DB.

## Troubleshooting

### Gemini API key errors
- INVALID_ARGUMENT with API_KEY_INVALID:
  - key is invalid or expired, generate a new key
- RESOURCE_EXHAUSTED 429:
  - quota or billing issue on Google project
- PERMISSION_DENIED 403:
  - project does not have Gemini access for selected model

### App cannot import Gemini client
- Ensure dependencies are installed from [python-scheduler-api/requirements.txt](python-scheduler-api/requirements.txt)
- Run server with the intended venv interpreter

### Port already in use
```bash
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

## Tech Stack

- Backend: Flask, SQLAlchemy, Flask-Login, APScheduler
- Frontend: React (CDN) + Tailwind CSS
- Database: PostgreSQL (Supabase) or local fallback
- Analytics: pandas, scikit-learn, statsmodels
- AI: Google GenAI SDK

## Deployment Checklist

- Use Gunicorn (already configured in `Procfile`)
- Set strong `SECRET_KEY`
- Configure production `DATABASE_URL`
- Restrict CORS origins
- Configure HTTPS
- Rotate and protect API keys
