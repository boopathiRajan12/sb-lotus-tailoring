# Deploy SB Lotus Tailoring Shop on PythonAnywhere (FREE)

## Why PythonAnywhere?
- 100% Free tier available
- Built-in MySQL database (free)
- Perfect for Flask apps
- No credit card required

---

## Step-by-Step Deployment

### Step 1: Create a PythonAnywhere Account

1. Go to https://www.pythonanywhere.com
2. Click **"Start running Python online"** > **"Create a Beginner account"**
3. Sign up (free, no credit card needed)
4. Your username will be part of your URL: `https://YOUR_USERNAME.pythonanywhere.com`

---

### Step 2: Create a MySQL Database

1. Go to the **Databases** tab
2. Set a MySQL password and click **"Initialize MySQL"**
3. Under "Create a database", type: `sblotus` and click **Create**
4. Note down these details:
   - **Host**: `YOUR_USERNAME.mysql.pythonanywhere-services.com`
   - **Username**: `YOUR_USERNAME`
   - **Password**: the password you just set
   - **Database name**: `YOUR_USERNAME$sblotus`

---

### Step 3: Upload Your Code

1. Go to the **Consoles** tab
2. Click **"Bash"** to open a terminal
3. Run these commands:

```bash
git clone https://github.com/boopathiRajan12/sb-lotus-tailoring.git
cd sb-lotus-tailoring
pip3 install --user -r requirements.txt
```

---

### Step 4: Update Database Configuration

1. Go to the **Files** tab
2. Navigate to `/home/YOUR_USERNAME/sb-lotus-tailoring/config.py`
3. Click to edit it
4. Change the `SQLALCHEMY_DATABASE_URI` line to:

```python
SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL',
    'mysql+pymysql://YOUR_USERNAME:YOUR_MYSQL_PASSWORD@YOUR_USERNAME.mysql.pythonanywhere-services.com/YOUR_USERNAME$sblotus'
)
```

Replace:
- `YOUR_USERNAME` with your PythonAnywhere username
- `YOUR_MYSQL_PASSWORD` with the MySQL password you set in Step 2

5. Click **Save**

---

### Step 5: Create the Web App

1. Go to the **Web** tab
2. Click **"Add a new web app"**
3. Click **Next** (accept the free domain)
4. Select **"Manual configuration"** (NOT Flask)
5. Select **Python 3.12**
6. Click **Next**

---

### Step 6: Configure the Web App

On the Web tab, update these settings:

**Source code:** `/home/YOUR_USERNAME/sb-lotus-tailoring`

**WSGI configuration file** - Click the link to edit it. Replace ALL contents with:

```python
import sys
import os

path = '/home/YOUR_USERNAME/sb-lotus-tailoring'
if path not in sys.path:
    sys.path.insert(0, path)

os.chdir(path)

from wsgi import application
```

Replace `YOUR_USERNAME` with your PythonAnywhere username. Click **Save**.

**Static files** - Add this mapping:
- URL: `/static/`
- Directory: `/home/YOUR_USERNAME/sb-lotus-tailoring/static`

---

### Step 7: Create Tables and Seed Data

1. Go to **Consoles** > open a **Bash** console
2. Run:

```bash
cd ~/sb-lotus-tailoring
python3 -c "from app import create_app; create_app()"
python3 seed_data.py
```

---

### Step 8: Launch!

1. Go to the **Web** tab
2. Click the green **"Reload"** button
3. Visit: `https://YOUR_USERNAME.pythonanywhere.com`

---

## Your Live Site URLs

| Page | URL |
|------|-----|
| Home | `https://YOUR_USERNAME.pythonanywhere.com/` |
| Products | `https://YOUR_USERNAME.pythonanywhere.com/products` |
| Custom Blouse | `https://YOUR_USERNAME.pythonanywhere.com/custom-blouse` |
| Admin Dashboard | `https://YOUR_USERNAME.pythonanywhere.com/admin/` |
| Login | `https://YOUR_USERNAME.pythonanywhere.com/login` |
| Register | `https://YOUR_USERNAME.pythonanywhere.com/register` |

## Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Customer | Register a new account at `/register` |

---

## Troubleshooting

**Error: "Something went wrong"**
- Go to Web tab > click "Error log" to see the issue
- Most common: wrong database credentials in config.py

**Error: "ModuleNotFoundError"**
- Open a Bash console and run: `pip3 install --user -r requirements.txt`

**Database tables not created**
- Open Bash console: `cd ~/sb-lotus-tailoring && python3 -c "from app import create_app; create_app()"`

**To update your code after making changes on GitHub:**
- Open Bash console: `cd ~/sb-lotus-tailoring && git pull`
- Go to Web tab > click **Reload**
