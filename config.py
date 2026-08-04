"""
Configuration settings for SB Lotus Tailoring Shop.

The database is Supabase (managed PostgreSQL). Connection details come from the
environment - the Supabase database password is a live credential and must
never be committed. Copy `.env.example` to `.env` for local development.

Resolution order for the connection string:
  1. SUPABASE_DB_URL   - the full URI copied from Supabase (preferred)
  2. DATABASE_URL      - same thing under the name most hosts inject
  3. SUPABASE_DB_HOST/_PORT/_USER/_PASSWORD/_NAME - assembled here, which
     also URL-encodes the password for you
"""
import os
from urllib.parse import parse_qsl, quote_plus, urlencode, urlsplit, urlunsplit

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load .env before anything reads os.environ. python-dotenv is in
# requirements.txt; the guard just keeps the app bootable without it.
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BASE_DIR, '.env'))
except ImportError:
    pass

# Supabase publishes a pooled connection on 6543 (pgbouncer in transaction
# mode). A client-side pool in front of it pins server-side sessions for no
# benefit, so on that port we let pgbouncer do all the pooling.
TRANSACTION_POOLER_PORT = 6543


def _env_flag(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in ('1', 'true', 'yes', 'on')


def _env_int(name, default):
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


def _normalise_db_url(url):
    """Return a psycopg2-flavoured SQLAlchemy URL with TLS forced on.

    Supabase (like Render and Heroku) hands out `postgres://` or `postgresql://`
    URIs; SQLAlchemy needs an explicit driver. Supabase also refuses plaintext
    connections, so `sslmode` is pinned when the URI omits it.
    """
    if url.startswith('postgres://'):
        url = 'postgresql://' + url[len('postgres://'):]
    if url.startswith('postgresql://'):
        url = 'postgresql+psycopg2://' + url[len('postgresql://'):]

    if not url.startswith('postgresql+psycopg2://'):
        return url  # SQLite fallback - nothing to fix up

    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query.setdefault('sslmode', 'require')
    return urlunsplit(parts._replace(query=urlencode(query)))


def _url_from_parts():
    """Assemble a URI from the discrete SUPABASE_DB_* variables, or '' if unset.

    Worth preferring over SUPABASE_DB_URL when the database password contains
    characters like `@`, `/` or `#`: those break a hand-pasted URI, and this
    path percent-encodes them.
    """
    host = os.environ.get('SUPABASE_DB_HOST', '').strip()
    password = os.environ.get('SUPABASE_DB_PASSWORD', '')
    if not (host and password):
        return ''
    user = os.environ.get('SUPABASE_DB_USER', 'postgres').strip()
    port = os.environ.get('SUPABASE_DB_PORT', '5432').strip()
    name = os.environ.get('SUPABASE_DB_NAME', 'postgres').strip()
    return (
        f'postgresql+psycopg2://{quote_plus(user)}:{quote_plus(password)}'
        f'@{host}:{port}/{name}'
    )


MISSING_DB_CONFIG = """
No database configured.

This app runs on Supabase (managed PostgreSQL). Set the connection string:

  1. Supabase dashboard -> Project Settings -> Database -> Connection string
  2. Copy the URI and put it in a `.env` file at the project root:

       SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres

     (start from `.env.example`, and see SUPABASE.md for the full walkthrough)
""".strip()


def _resolve_database_uri():
    """Return (uri, source_label). Raises when nothing is configured."""
    for var in ('SUPABASE_DB_URL', 'DATABASE_URL'):
        raw = os.environ.get(var, '').strip()
        if raw:
            return _normalise_db_url(raw), var

    assembled = _url_from_parts()
    if assembled:
        return _normalise_db_url(assembled), 'SUPABASE_DB_* variables'

    raise RuntimeError(MISSING_DB_CONFIG)


def _uses_transaction_pooler(uri):
    try:
        return urlsplit(uri).port == TRANSACTION_POOLER_PORT
    except ValueError:
        return False


def _engine_options(uri):
    """create_engine kwargs tuned for a managed Postgres behind a pooler."""
    connect_args = {
        'connect_timeout': _env_int('DB_CONNECT_TIMEOUT', 10),
        'application_name': os.environ.get('DB_APP_NAME', 'sb-lotus-tailoring'),
        # Supabase sits behind a NAT that silently drops idle connections;
        # TCP keepalives surface a dead socket instead of hanging a request.
        'keepalives': 1,
        'keepalives_idle': 30,
        'keepalives_interval': 10,
        'keepalives_count': 5,
    }

    if _uses_transaction_pooler(uri):
        from sqlalchemy.pool import NullPool
        # NullPool rejects pool sizing kwargs - pgbouncer owns pooling here.
        return {'poolclass': NullPool, 'connect_args': connect_args}

    return {
        # Recycle before Supabase drops the connection out from under us.
        'pool_pre_ping': True,
        'pool_recycle': _env_int('DB_POOL_RECYCLE', 280),
        # The free tier allows ~60 direct connections in total; keep each
        # worker's share small so several gunicorn workers still fit.
        'pool_size': _env_int('DB_POOL_SIZE', 5),
        'max_overflow': _env_int('DB_MAX_OVERFLOW', 2),
        'connect_args': connect_args,
    }


class Config:
    # Secret key for session management and CSRF protection
    SECRET_KEY = os.environ.get('SECRET_KEY', 'sb-lotus-tailoring-secret-key-change-in-production')

    # ── Database (Supabase PostgreSQL) ───────────────────────────────────────
    SQLALCHEMY_DATABASE_URI, DATABASE_URI_SOURCE = _resolve_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = _engine_options(SQLALCHEMY_DATABASE_URI)

    # Create/patch tables at startup. Turn off once the schema is managed
    # entirely through supabase/schema.sql or the Supabase migration tooling.
    DB_AUTO_CREATE = _env_flag('DB_AUTO_CREATE', default=True)

    # ── Session cookie hardening ─────────────────────────────────────────────
    # The API authenticates with a session cookie, so these matter. `Lax` still
    # allows normal top-level navigation into the SPA while blocking the
    # cross-site POSTs that would otherwise be CSRF-able.
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    # Secure cookies require HTTPS - on by default in production (Render sets
    # RENDER), off locally so plain-HTTP dev still works.
    SESSION_COOKIE_SECURE = _env_flag('SESSION_COOKIE_SECURE', default=bool(os.environ.get('RENDER')))
    PERMANENT_SESSION_LIFETIME = 60 * 60 * 24 * 14  # 14 days

    # File upload settings
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'images', 'products')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

    # Pagination
    PRODUCTS_PER_PAGE = 12
