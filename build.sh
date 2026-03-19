#!/usr/bin/env bash
# Render build script
set -o errexit

pip install -r requirements.txt

# Create tables and seed data
python -c "from app import create_app; create_app()"
python seed_data.py
