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

### 4. Run the Application

```bash
python app.py
```

This will:
- Create all database tables automatically
- Create a default admin account (username: `admin`, password: `admin123`)
- Start the server at `http://localhost:5000`

### 5. Load Sample Data (Optional)

In a separate terminal:
```bash
python seed_data.py
```

This adds sample categories and products to the database.

## PyCharm Setup

1. Open PyCharm and select **File > Open**, navigate to the `sb_lotus_tailoring` folder
2. Go to **File > Settings > Project > Python Interpreter**
3. Click the gear icon and select **Add Interpreter > Add Local Interpreter**
4. Create a new virtual environment or use an existing Python installation
5. Open the terminal in PyCharm and run `pip install -r requirements.txt`
6. Right-click `app.py` and select **Run 'app'**

## Usage

### Admin Login
- URL: `http://localhost:5000/login`
- Username: `admin`
- Password: `admin123`
- Admin dashboard: `http://localhost:5000/admin/`

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
├── app.py                  # Main application entry point
├── config.py               # Configuration (DB, uploads, etc.)
├── requirements.txt        # Python dependencies
├── database_setup.sql      # MySQL table creation scripts
├── seed_data.py            # Sample data loader
├── models/                 # Database models (SQLAlchemy)
│   ├── __init__.py
│   ├── database.py         # SQLAlchemy instance
│   ├── user.py             # User model (customers + admin)
│   ├── category.py         # Product categories
│   ├── product.py          # Products
│   ├── product_image.py    # Multiple images per product
│   ├── cart.py             # Shopping cart items
│   └── order.py            # Orders and order items
├── routes/                 # Flask route handlers
│   ├── __init__.py
│   ├── auth.py             # Login, register, logout
│   ├── admin.py            # Admin dashboard & CRUD
│   ├── shop.py             # Public product pages
│   └── cart.py             # Cart & checkout
├── templates/              # HTML templates (Jinja2)
│   ├── base.html           # Base layout with navbar & footer
│   ├── auth/               # Login & register pages
│   ├── user/               # Customer-facing pages
│   └── admin/              # Admin dashboard pages
└── static/                 # Static assets
    ├── css/style.css       # Main stylesheet
    ├── js/main.js          # Client-side JavaScript
    └── images/products/    # Uploaded product images
```
