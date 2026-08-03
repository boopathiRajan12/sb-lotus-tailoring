# SB LOTUS TAILORING SHOP - Setup Instructions

## Prerequisites
- Python 3.9+ installed
- Node.js 18+ (for the React frontend)
- A free Supabase account — <https://supabase.com>
- PyCharm (optional, any IDE works)

## Step-by-Step Setup

### 1. Create a Supabase Project

Sign up at <https://supabase.com>, create a project, and save the database
password it asks you to set.

### 2. Configure the Connection

Copy the connection URI from Project Settings → Database → Connection string
(use the **Session pooler**, port 5432), then:

```bash
cp .env.example .env
```

Edit `.env` and paste the URI into `SUPABASE_DB_URL`, replacing
`[YOUR-PASSWORD]` with your real password. Also set `SECRET_KEY` and
`ADMIN_PASSWORD`.

`.env` is gitignored — credentials never go in `config.py` or into git.

[SUPABASE.md](SUPABASE.md) covers this in full, including which pooler host to
pick, migrating existing data, and the row-level-security lockdown you should
apply.

### 3. Install Python Dependencies

Open a terminal in the `sb_lotus_tailoring` folder:
```bash
pip install -r requirements.txt
```

### 4. Create the Schema

Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor.
Then check the connection works:

```bash
python scripts/db_check.py
```

### 5. Run the Backend

```bash
python app.py
```

This will:
- Create any missing tables automatically
- Create a default admin account (username: `admin`, password: `ADMIN_PASSWORD`)
- Start the API server at `http://localhost:5000`

### 6. Load Sample Data (Optional)

In a separate terminal:
```bash
python seed_data.py
```

This adds sample categories and products to the database.

Migrating from the old MySQL or SQLite database instead? See
[SUPABASE.md](SUPABASE.md#6-load-data).

### 7. Run the Frontend

In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```

This starts the React app at `http://localhost:5173`, which proxies API calls to the Flask backend on port 5000. Use `http://localhost:5173` in your browser during development (not port 5000 - that's the API only).

## PyCharm Setup

1. Open PyCharm and select **File > Open**, navigate to the `sb_lotus_tailoring` folder
2. Go to **File > Settings > Project > Python Interpreter**
3. Click the gear icon and select **Add Interpreter > Add Local Interpreter**
4. Create a new virtual environment or use an existing Python installation
5. Open the terminal in PyCharm and run `pip install -r requirements.txt`
6. Right-click `app.py` and select **Run 'app'**

## Usage

### Admin Login
- URL: `http://localhost:5173/login`
- Username: `admin`
- Password: whatever you set as `ADMIN_PASSWORD` in `.env` (`admin123` if unset)
- Admin dashboard: `http://localhost:5173/admin`

### Admin Workflow
1. Log in as admin
2. Add categories (Blouse, Uniform, Sudithar, etc.)
3. Add products with images and prices
4. Mark blouse designs as "Custom Blouse" to show them in the Custom Blouse section
5. Manage orders from the Orders page

### Customer Workflow
1. Register a new account at `/register`
2. Browse products and custom blouse designs
3. Add items to cart
4. Proceed to checkout
5. Place order (no payment gateway - pay on delivery/pickup)

## Project Structure
```
sb_lotus_tailoring/
├── app.py                  # Main application entry point (JSON API + SPA static serving)
├── config.py               # Configuration (Supabase connection, uploads, etc.)
├── requirements.txt        # Python dependencies
├── .env.example            # Template for the Supabase credentials
├── SUPABASE.md             # Supabase setup, migration, and security guide
├── supabase/schema.sql     # PostgreSQL schema + row-level-security lockdown
├── scripts/
│   ├── db_check.py         # Connectivity + row-count smoke test
│   └── migrate_to_supabase.py  # One-time data copy from MySQL/SQLite
├── seed_data.py            # Sample data loader
├── models/                 # Database models (SQLAlchemy), each with a to_dict() serializer
│   ├── __init__.py
│   ├── database.py         # SQLAlchemy instance
│   ├── user.py             # User model (customers + admin)
│   ├── category.py         # Product categories
│   ├── product.py          # Products
│   ├── product_image.py    # Multiple images per product
│   ├── cart.py             # Shopping cart items
│   └── order.py            # Orders and order items
├── routes/                 # Flask blueprints, all returning JSON under /api
│   ├── __init__.py
│   ├── auth.py             # /api/auth - login, register, logout, profile
│   ├── admin.py            # /api/admin - dashboard & CRUD
│   ├── shop.py             # /api - public product/category endpoints
│   └── cart.py             # /api - cart & checkout
├── static/images/products/ # Uploaded product images (also mirrored in DB)
└── frontend/                # React (Vite) single-page app
    ├── vite.config.js       # Dev server + proxy to Flask (:5000)
    └── src/
        ├── api/             # fetch client, format helpers
        ├── context/         # AuthContext, ToastContext
        ├── components/      # Navbar, Footer, ProductCard, route guards, etc.
        ├── pages/           # customer-facing pages
        └── pages/admin/     # admin dashboard pages
```
