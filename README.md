# SB LOTUS TAILORING SHOP

A full-stack tailoring shop web application: a Flask + SQLAlchemy (PostgreSQL/MySQL/SQLite) JSON API backend with a React (Vite) single-page frontend.

## One-Click Deploy to Render (FREE)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/boopathiRajan12/sb-lotus-tailoring)

**Click the button above, sign in with GitHub, and your site will be live in 5 minutes!**

## Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Customer | Register at `/register` |

## Features

- Admin dashboard with product/category/order management
- User registration and login
- Product browsing with search and category filters
- Custom blouse design selection with measurements
- Shopping cart and checkout system
- Order tracking (pending, confirmed, stitching, ready, delivered)
- Mobile responsive design

## Local Setup

The backend (Flask API, port 5000) and frontend (React/Vite, port 5173) run as two processes in development. Vite proxies `/api` and `/product-image` requests to Flask, so the browser only ever talks to `http://localhost:5173`.

**Backend:**
1. Install MySQL and create database `sb_lotus_tailoring` (optional — falls back to SQLite automatically if MySQL isn't running)
2. Run: `pip install -r requirements.txt`
3. Run: `python app.py`
4. Load sample data (once): `python seed_data.py`

**Frontend** (in a separate terminal):
1. `cd frontend`
2. `npm install`
3. `npm run dev`
4. Open: http://localhost:5173

**Production build:** `build.sh` runs `npm run build` (output to `frontend/dist`) before starting Python; `app.py` serves that build directly, so only one process/port is needed in production (see `render.yaml`).
