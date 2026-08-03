# Deploying SB Lotus Tailoring Shop

The database is Supabase, so it is already hosted and shared no matter where the
app itself runs. Deployment is: get the code onto a host, set two environment
variables, start gunicorn.

Set up Supabase first — see [SUPABASE.md](SUPABASE.md).

## Environment variables (every host)

| Variable | Value | Required |
|----------|-------|----------|
| `SUPABASE_DB_URL` | Connection URI from Supabase → Settings → Database | Yes |
| `SECRET_KEY` | `python -c "import secrets; print(secrets.token_hex(32))"` | Yes |
| `ADMIN_PASSWORD` | Password for the auto-created admin account | Strongly recommended |
| `SESSION_COOKIE_SECURE` | `true` when serving over HTTPS | Auto-on for Render |

The app refuses to start without a database URL rather than silently falling
back to a local file — an empty SQLite database that looks like it works is a
worse failure than a clear error.

---

## Option A — Render (recommended)

`render.yaml` is already set up for this. No Render database is provisioned;
the app points at Supabase.

1. Push the repo to GitHub.
2. In Render: **New → Blueprint**, pick the repo. It reads `render.yaml`.
3. Open the service's **Environment** tab and set:
   - `SUPABASE_DB_URL` — your Supabase URI
   - `ADMIN_PASSWORD` — your admin password

   (`SECRET_KEY` is generated for you.)
4. **Manual Deploy → Deploy latest commit.**

`build.sh` builds the React app into `frontend/dist`, installs the Python
dependencies, creates any missing tables in Supabase, and seeds sample data if
the database is empty. Flask then serves the built SPA and the API from one
process, so only one port is needed.

If the first build ran before you set `SUPABASE_DB_URL`, it skips the database
step and says so in the log — just redeploy once the variable is in place.

---

## Option B — PythonAnywhere

The free tier can't reach external hosts on arbitrary ports, so **the Supabase
connection will be blocked unless you are on a paid plan**. Check this before
committing to PythonAnywhere; Render's free tier has no such restriction.

On a paid account:

1. **Consoles → Bash:**

   ```bash
   git clone https://github.com/boopathiRajan12/sb-lotus-tailoring.git
   cd sb-lotus-tailoring
   pip3 install --user -r requirements.txt
   ```

2. Create `.env` in the project root (Files tab, or `nano .env`):

   ```ini
   SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres
   SECRET_KEY=<a long random string>
   ADMIN_PASSWORD=<your admin password>
   SESSION_COOKIE_SECURE=true
   ```

   No edits to `config.py` — it reads `.env` automatically.

3. **Web → Add a new web app → Manual configuration → Python 3.12.**

4. **Source code:** `/home/YOUR_USERNAME/sb-lotus-tailoring`

   **WSGI configuration file** — replace the contents with:

   ```python
   import sys
   import os

   path = '/home/YOUR_USERNAME/sb-lotus-tailoring'
   if path not in sys.path:
       sys.path.insert(0, path)

   os.chdir(path)

   from wsgi import application
   ```

   **Static files** — map URL `/static/` to
   `/home/YOUR_USERNAME/sb-lotus-tailoring/static`

5. Build the frontend and the schema:

   ```bash
   cd ~/sb-lotus-tailoring/frontend && npm install && npm run build && cd ..
   python3 scripts/db_check.py
   python3 seed_data.py
   ```

6. **Web → Reload.**

---

## Option C — Any VPS / container

```bash
export SUPABASE_DB_URL='postgresql://...'
export SECRET_KEY='...'
export SESSION_COOKIE_SECURE=true

pip install -r requirements.txt
cd frontend && npm install && npm run build && cd ..
gunicorn wsgi:application --bind 0.0.0.0:8000 --workers 4
```

Watch the connection budget: each worker holds up to `DB_POOL_SIZE +
DB_MAX_OVERFLOW` (7 by default) connections, and the Supabase free tier allows
around 60 in total. Either keep workers × 7 under that, or switch to the
transaction pooler on port 6543 — the app detects that port and lets pgbouncer
handle pooling instead.

---

## Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | your `ADMIN_PASSWORD` (`admin123` if you didn't set one) |
| Customer | Register a new account at `/register` | |

The admin account is created on first startup only. Changing `ADMIN_PASSWORD`
afterwards has no effect — change it from the profile page instead.

---

## Troubleshooting

**App won't start: "No database configured"**
`SUPABASE_DB_URL` isn't reaching the process. On Render, confirm it's in the
Environment tab and redeploy; elsewhere, confirm `.env` sits next to `app.py`.

**`FATAL: password authentication failed`**
Wrong password, or a password containing `@` / `#` / `?` pasted un-encoded into
the URI. Use the `SUPABASE_DB_HOST` / `SUPABASE_DB_PASSWORD` variables instead —
they percent-encode it for you. Or reset the password under Supabase →
Settings → Database.

**Connection times out**
Usually the direct `db.<ref>.supabase.co` host, which is IPv6-only. Switch to
the pooler host (`...pooler.supabase.com:5432`). Also check the project isn't
paused — free projects sleep after a week idle.

**`remaining connection slots are reserved` / `too many clients`**
Too many gunicorn workers × pool size. Lower `DB_POOL_SIZE`, lower the worker
count, or move to port 6543.

**Tables are missing**
```bash
python3 -c "from app import create_app; create_app()"
```
or run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor.

**Data is visible outside the app**
Row-level security isn't enabled. Run the RLS block at the bottom of
`supabase/schema.sql` — see the Security section of [SUPABASE.md](SUPABASE.md).

**Updating a deployment**
```bash
git pull
```
then redeploy (Render) or Reload (PythonAnywhere).
