# Supabase Setup

The app's database is Supabase — managed PostgreSQL. Flask talks to it directly
over the Postgres wire protocol with SQLAlchemy, exactly as it would with any
other Postgres. Supabase Auth, PostgREST and the JS client are **not** used:
authentication stays with Flask-Login and session cookies.

---

## 1. Create the project

1. Sign up at <https://supabase.com> and create a new project.
2. Set a database password when prompted — **save it**, it is only shown once.
   (If you lose it: Project Settings → Database → Reset database password.)
3. Wait for the project to finish provisioning.

## 2. Copy the connection string

Project Settings → **Database** → **Connection string** → **URI**.

You'll be offered a few hosts. Use this one:

| Option | Host / port | Use it when |
|--------|-------------|-------------|
| **Session pooler** | `...pooler.supabase.com:5432` | **Default.** Works over IPv4, and a long-lived gunicorn process reuses connections. |
| Transaction pooler | `...pooler.supabase.com:6543` | Serverless / very high worker counts. The app detects port 6543 and hands pooling to pgbouncer automatically. |
| Direct connection | `db.<ref>.supabase.co:5432` | Only if your network has IPv6. Most home ISPs and CI runners don't. |

Replace `[YOUR-PASSWORD]` in the copied URI with your actual password.

## 3. Configure the app

```bash
cp .env.example .env
```

Then edit `.env`:

```ini
SUPABASE_DB_URL=postgresql://postgres.abcdefgh:my-password@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
SECRET_KEY=<python -c "import secrets; print(secrets.token_hex(32))">
ADMIN_PASSWORD=<something other than admin123>
```

> If your password contains `@`, `/`, `#`, `?` or `%`, don't paste it into the
> URI — a raw `@` splits the URI in the wrong place. Use the discrete variables
> instead (`SUPABASE_DB_HOST`, `SUPABASE_DB_USER`, `SUPABASE_DB_PASSWORD`, …),
> which are percent-encoded for you. Both forms are in `.env.example`.

## 4. Create the schema

Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor
(Dashboard → SQL Editor → New query → paste → Run).

You can skip this — the app calls `db.create_all()` at startup and builds the
same tables — but running it by hand also applies the **RLS lockdown**, which
matters. See "Security" below.

## 5. Verify

```bash
pip install -r requirements.txt
python scripts/db_check.py
```

Expected output: the PostgreSQL version, then a row count for every table.
If it fails, the error message lists the usual causes.

## 6. Load data

**Fresh install** — sample categories and products:

```bash
python seed_data.py
```

**Migrating an existing database** — copy your current rows across:

```bash
# preview first: counts rows, writes nothing
python scripts/migrate_to_supabase.py --source sqlite:///sb_lotus_tailoring.db --dry-run

# then for real
python scripts/migrate_to_supabase.py --source sqlite:///sb_lotus_tailoring.db
```

From the old local MySQL instead:

```bash
python scripts/migrate_to_supabase.py \
  --source mysql+pymysql://root:Root@localhost:3306/sb_lotus_tailoring
```

The script copies tables parent-first so foreign keys stay valid, preserves the
original primary keys, skips columns your old database never had, and resets
the Postgres `SERIAL` sequences afterwards so the next insert doesn't collide.
Pass `--wipe` to empty the destination first when re-running a failed attempt —
that deletes every row already in Supabase, so be deliberate about it.

## 7. Run

```bash
python app.py                      # API on :5000
cd frontend && npm run dev         # SPA on :5173  (separate terminal)
```

---

## Deploying

Set the same environment variables on your host — that is the entire change,
because nothing about the connection is hardcoded.

**Render** — `render.yaml` no longer provisions a Render Postgres. In the
dashboard's Environment tab set:

| Variable | Value |
|----------|-------|
| `SUPABASE_DB_URL` | the URI from step 2 |
| `SECRET_KEY` | generated automatically by `render.yaml` |
| `ADMIN_PASSWORD` | your admin password |

`SESSION_COOKIE_SECURE` turns itself on because Render sets `RENDER`.

**Anywhere else** (PythonAnywhere, Fly, a VPS): export `SUPABASE_DB_URL` and
`SECRET_KEY` in the process environment, and set `SESSION_COOKIE_SECURE=true`
if you serve over HTTPS.

---

## Security

Supabase publishes every table in the `public` schema through PostgREST at
`https://<ref>.supabase.co/rest/v1/`, and the anon API key is public by design.
**Without row-level security, anyone who learns your project ref can read
`users` and `orders` — names, emails, phone numbers, addresses — and write to
them.** This is the one genuinely new risk in moving from a private Postgres to
Supabase.

`supabase/schema.sql` closes it: it enables RLS on all ten tables and defines no
policies, and revokes the `anon` / `authenticated` grants. Flask connects as the
owner role, which bypasses RLS, so the app is unaffected. If you let
`db.create_all()` build the schema instead, run at minimum the `ALTER TABLE …
ENABLE ROW LEVEL SECURITY` block at the bottom of that file.

Check it under Dashboard → Table Editor: every table should show an
"RLS enabled" badge.

Other things worth doing:

- Change `ADMIN_PASSWORD` from the `admin123` default before the first startup —
  that is when the admin account gets created.
- Keep `.env` out of git (it already is) and never paste the database password
  or the `service_role` key into frontend code.
- Free-tier projects pause after a week of inactivity; the first request after
  that fails until you resume them from the dashboard.

---

## Notes

**Connection limits.** The free tier allows roughly 60 direct connections.
Each gunicorn worker keeps its own SQLAlchemy pool, sized `DB_POOL_SIZE`
(default 5) plus `DB_MAX_OVERFLOW` (2), so 4 workers is about 28 connections.
Raise the workers and you should lower the pool, or move to port 6543.

**Schema changes.** Unchanged from before: `db.create_all()` adds new tables and
`_ADDED_COLUMNS` in `app.py` adds new columns, both at startup, both idempotent.
On Postgres this now runs behind an advisory lock so simultaneous gunicorn
workers can't race each other into a duplicate-DDL error. Set
`DB_AUTO_CREATE=false` to switch it off and manage the schema through
`supabase/schema.sql` alone.

**Product images** stay in the database as `bytea` (`product_images.image_data`),
served by `/product-image/<id>`. They count against the 500 MB database quota.
Moving them to Supabase Storage would be a sensible follow-up; it is a separate
change and nothing here depends on it.
