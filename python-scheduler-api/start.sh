#!/bin/bash

echo ""
echo "========================================"
echo "  VacanSee - Reservation System"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    echo "Please install Python 3.8+ from https://www.python.org"
    exit 1
fi

# Go to app directory
cd "$(dirname "$0")/python-scheduler-api"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "Virtual environment created!"
fi

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
echo ""
echo "Installing dependencies..."
pip install -r requirements.txt -q

# Run setup notification
echo ""
echo "========================================"
echo "Setup Instructions:"
echo "========================================"
echo ""
echo "1. Starting Flask server..."
echo "   The app will run at: http://localhost:5000"
echo ""
echo "2. IMPORTANT - On First Run:"
echo "   Visit http://localhost:5000/setup"
echo "   This initializes the database with test users and rooms"
echo ""
echo "3. Default Test Credentials:"
echo "   Admin:   admin / admin123"
echo "   Student: ccs / 1234"
echo ""
echo "========================================"
echo ""

# Start Flask app
python app.py
