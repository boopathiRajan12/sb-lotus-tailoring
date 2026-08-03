#!/usr/bin/env bash
# Render build script
set -o errexit

# Build the React frontend (output goes to frontend/dist, served by Flask)
cd frontend
npm install
npm run build
cd ..

pip install -r requirements.txt

# Create tables and seed data in Supabase. Skipped when no connection string is
# configured yet - on a first deploy you may not have pasted SUPABASE_DB_URL
# into the dashboard, and the app performs the same bootstrap at startup.
if [ -n "$SUPABASE_DB_URL" ] || [ -n "$DATABASE_URL" ]; then
  python -c "from app import create_app; create_app()"
  python seed_data.py
else
  echo "No SUPABASE_DB_URL set - skipping database bootstrap."
  echo "Set it in the Render dashboard (Environment tab), then redeploy."
fi
