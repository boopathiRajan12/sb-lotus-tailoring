# SB LOTUS TAILORING SHOP

A full-stack tailoring shop web application built with Flask, SQLAlchemy, and PostgreSQL/MySQL.

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

1. Install MySQL and create database: `sb_lotus_tailoring`
2. Update `config.py` with your MySQL credentials
3. Run: `pip install -r requirements.txt`
4. Run: `python app.py`
5. Load sample data: `python seed_data.py`
6. Open: http://localhost:5000
