#!/usr/bin/env bash
# Render build script
set -o errexit

# Build the React frontend (output goes to frontend/dist, served by Flask)
cd frontend
npm install
npm run build
cd ..

pip install -r requirements.txt

# Database bootstrap and seeding are now handled during Render's pre-deploy 
# phase (configured in render.yaml) to avoid connection issues during build.

