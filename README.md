# SB LOTUS TAILORING SHOP

A full-stack tailoring shop web application: a Flask + SQLAlchemy JSON API backend on **Supabase** (managed PostgreSQL), with a React (Vite) single-page frontend.

## Quick Start

1. Create a free Supabase project and copy its connection URI
2. `cp .env.example .env` and paste the URI into `SUPABASE_DB_URL`
3. `pip install -r requirements.txt && python scripts/db_check.py`

Full walkthrough: **[SUPABASE.md](SUPABASE.md)** · Local dev: [SETUP.md](SETUP.md) · Hosting: [DEPLOYMENT.md](DEPLOYMENT.md)

## Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | your `ADMIN_PASSWORD` env var |
| Customer | Register at `/register` | |

There is no default admin password. If `ADMIN_PASSWORD` is unset or shorter than
10 characters, no admin account is created and the startup log says so.

## Features

### Shopping
- Product browsing with search across names **and** descriptions
- Filter by category, price range, and custom-blouse-only; sort by newest, price, name, or rating
- Product detail with image gallery (zoom, thumbnails, keyboard nav), stock status, and units sold
- **Wishlist** — save designs, move them straight to the cart
- **Ratings & reviews** — 1-5 stars with a rating histogram; reviews from real buyers are flagged "Verified purchase"
- Custom blouse designs with a guided measurement form and pre-submit review step

### Ordering
- Cart with quantity steppers, live stock warnings, and per-line custom measurements
- Checkout with a progress stepper, saved address/phone pre-fill, and stock re-validation at purchase time
- **Order tracking timeline** — pending → confirmed → stitching → ready → delivered, with timestamped history
- **Order cancellation** by the customer while an order is still pending or confirmed (releases reserved stock)
- **Reorder** — copy a past order's items back into the cart in one click
- Printable order receipts

### Account
- Profile with tabs for orders, contact details, measurements, and password
- **Saved measurements** — enter once, auto-filled into every future custom order
- Password change with a strength meter

### Admin
- Dashboard with revenue totals, month-over-month growth, a 6-month revenue chart, an order-status donut, best sellers, and low-stock alerts
- Order management with status/date/text filters and **CSV export**
- Status updates that append a note to the customer-visible timeline; cancelling restores stock
- Product management with search, status filters, one-click show/hide, drag-and-drop image upload, compare-at pricing, and featured flags
- Customer management with order stats, saved measurements, and account suspend/reinstate
- Review moderation

### Interface
- **Dark mode** — follows your OS by default, toggle in the navbar, remembered per browser
- Loading skeletons instead of blank screens; every failed fetch shows a real error state
- Toast notifications, confirmation dialogs (no more `window.confirm`), and empty states throughout
- Fully responsive, with keyboard focus rings, skip-to-content, ARIA labels, and `prefers-reduced-motion` support

## Local Setup

The backend (Flask API, port 5000) and frontend (React/Vite, port 5173) run as two processes in development. Vite proxies `/api` and `/product-image` requests to Flask, so the browser only ever talks to `http://localhost:5173`.

**Backend:**
1. Point `.env` at your Supabase project (see [SUPABASE.md](SUPABASE.md))
2. Run: `pip install -r requirements.txt`
3. Run: `python app.py`
4. Load sample data (once): `python seed_data.py`

**Frontend** (in a separate terminal):
1. `cd frontend`
2. `npm install`
3. `npm run dev`
4. Open: http://localhost:5173

**Production build:** `build.sh` runs `npm run build` (output to `frontend/dist`) before starting Python; `app.py` serves that build directly, so only one process/port is needed in production (see `render.yaml`).

## Database

Supabase (managed PostgreSQL), reached directly over the Postgres wire protocol with SQLAlchemy — Supabase Auth and PostgREST are not used, so authentication stays with Flask-Login and session cookies.

- `supabase/schema.sql` — the schema, plus the row-level-security lockdown that keeps `users` and `orders` off the public PostgREST endpoint. **Run it.**
- `scripts/db_check.py` — connectivity and row-count smoke test
- `scripts/migrate_to_supabase.py` — one-time data copy from an old MySQL/SQLite database

New columns added after the initial release are applied automatically at startup by `_migrate_db()` in `app.py`, driven by the `_ADDED_COLUMNS` table; `db.create_all()` handles brand-new tables. Both are idempotent and, on Postgres, serialised behind an advisory lock so concurrent gunicorn workers don't race — an existing deployment upgrades in place with no manual SQL.

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `SUPABASE_DB_URL` | Supabase connection URI | **Required** — the app won't start without it |
| `SECRET_KEY` | Session signing key | **Required in production** — the app won't start on a placeholder |
| `ADMIN_PASSWORD` | Password for the first admin account (10+ chars) | None — no admin is created without it |
| `PRODUCTION` | Secure cookies + HSTS on, debug server off, `SECRET_KEY` enforced | On when `RENDER` is set |
| `ADMIN_USERNAME` / `ADMIN_EMAIL` | Identity of that first admin account | `admin` / `admin@sblotus.com` |
| `SESSION_COOKIE_SECURE` | Force HTTPS-only session cookies | On in production, off locally |
| `DATABASE_URL` | Alias for `SUPABASE_DB_URL`, for hosts that inject it | — |
| `SUPABASE_DB_HOST` / `_PORT` / `_USER` / `_PASSWORD` / `_NAME` | Connection parts, assembled and URL-encoded here | Use instead of `SUPABASE_DB_URL` when the password has special characters |
| `DB_AUTO_CREATE` | Run `create_all()` + column patches at startup | `true` |
| `DB_POOL_SIZE` / `DB_MAX_OVERFLOW` / `DB_POOL_RECYCLE` | SQLAlchemy pool sizing | `5` / `2` / `280` |

See `.env.example`.

## Tests

```bash
pip install -r requirements-dev.txt
pytest
```

The suite runs against in-memory SQLite, so it never touches Supabase and needs
no environment set up. It covers authentication and login throttling, cart and
checkout stock accounting, order cancellation, admin authorisation, image
upload handling, and the security configuration in `app.py` / `config.py`.

## Scope note: payments

Checkout places an order without taking payment — orders are settled with the
shop directly. There is no payment provider integrated, and no card data is
collected or stored anywhere in this codebase.

## API Overview

| Area | Endpoints |
|------|-----------|
| Auth | `POST /api/auth/register`, `/login`, `/logout` · `GET /api/auth/me`, `/profile` · `PUT /api/auth/profile`, `/password`, `/measurements` |
| Shop | `GET /api/home`, `/categories`, `/products`, `/products/<id>`, `/custom-blouse`, `/search-suggestions` |
| Cart | `GET/DELETE /api/cart` · `POST /api/cart/items` · `PUT/DELETE /api/cart/items/<id>` |
| Orders | `GET/POST /api/checkout` · `GET /api/orders`, `/orders/<id>` · `POST /api/orders/<id>/cancel`, `/reorder` |
| Wishlist | `GET /api/wishlist`, `/ids` · `POST /api/wishlist/toggle`, `/<id>/move-to-cart` · `DELETE /api/wishlist/<id>` |
| Reviews | `GET /api/reviews/product/<id>`, `/mine`, `/pending` · `POST /api/reviews` · `DELETE /api/reviews/<id>` |
| Admin | `GET /api/admin/dashboard`, `/orders`, `/orders/export`, `/products`, `/categories`, `/users`, `/reviews` (plus the matching write endpoints) |

## Project Structure

```
app.py                  Application factory, image serving, auto-migrations
config.py               Supabase connection + pooling, session-cookie hardening,
                        upload limits
supabase/schema.sql     PostgreSQL schema and RLS lockdown
scripts/                db_check.py, migrate_to_supabase.py
models/                 SQLAlchemy models (user, product, category, cart, order,
                        product_image, wishlist, review)
routes/                 API blueprints (auth, shop, cart, admin, wishlist, review)
                        plus helpers.py for shared request parsing/validation
frontend/src/
  api/                  fetch wrapper, formatters, shared measurement constants
  components/           Icon set, ProductCard, Navbar, Footer, OrderTimeline,
                        ui.jsx (skeletons, modals, stars, steppers, badges)
  context/              Auth, Toast, Theme, Wishlist providers
  hooks/useApi.js       Data fetching with loading/error, debounce, click-outside
  pages/                Customer pages + pages/admin/ for the admin panel
  styles/style.css      Design tokens and the full component library
```
