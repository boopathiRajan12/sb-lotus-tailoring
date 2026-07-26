#!/usr/bin/env bash
# Render build script
set -o errexit

# Build the React frontend (output goes to frontend/dist, served by Flask)
cd frontend
npm install
npm run build
cd ..

pip install -r requirements.txt

# Create tables and seed data
python -c "from app import create_app; create_app()"
python seed_data.py
