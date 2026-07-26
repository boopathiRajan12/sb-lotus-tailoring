# SB LOTUS TAILORING SHOP - Setup Instructions

## Prerequisites
- Python 3.9+ installed
- MySQL Server installed and running
- PyCharm (optional, any IDE works)

## Step-by-Step Setup

### 1. Create MySQL Database

Open MySQL command line or MySQL Workbench and run:
```sql
CREATE DATABASE sb_lotus_tailoring CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Update Database Credentials

Open `config.py` and update the MySQL connection string with your credentials:
```python
SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://YOUR_USERNAME:YOUR_PASSWORD@localhost:3306/sb_lotus_tailoring'
```
Default is `root:root` - change this to match your MySQL setup.

### 3. Install Python Dependencies

Open a terminal in the `sb_lotus_tailoring` folder:
```bash
pip install -r requirements.txt
```

### 4. Run the Backend

```bash
python app.py
```

This will:
- Create all database tables automatically
- Create a default admin account (username: `admin`, password: `admin123`)
- Start the API server at `http://localhost:5000`

### 5. Load Sample Data (Optional)

In a separate terminal:
```bash
python seed_data.py
```

This adds sample categories and products to the database.

### 6. Run the Frontend

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
- Password: `admin123`
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
├── config.py               # Configuration (DB, uploads, etc.)
├── requirements.txt        # Python dependencies
├── database_setup.sql      # MySQL table creation scripts
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
