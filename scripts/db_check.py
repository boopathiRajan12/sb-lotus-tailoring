"""
Supabase connectivity smoke test.

Confirms the configured connection string actually works, then prints the
server version, which tables exist, and how many rows are in each - enough to
tell "not connected" apart from "connected but empty".

Usage:
    python scripts/db_check.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, func, inspect, select, text  # noqa: E402

import models  # noqa: E402,F401  (imports every model onto db.metadata)
from models import db  # noqa: E402


def safe_label(url):
    if '@' not in url:
        return url
    creds, host = url.rsplit('@', 1)
    if ':' in creds:
        creds = creds.rsplit(':', 1)[0] + ':***'
    return f'{creds}@{host}'


def main():
    try:
        from config import Config
    except RuntimeError as err:
        print(err)
        return 1

    url = Config.SQLALCHEMY_DATABASE_URI
    print(f'Connection: {safe_label(url)}')
    print(f'Configured by: {Config.DATABASE_URI_SOURCE}\n')

    engine = create_engine(url, **Config.SQLALCHEMY_ENGINE_OPTIONS)
    try:
        with engine.connect() as conn:
            if engine.dialect.name == 'postgresql':
                version = conn.execute(text('SHOW server_version')).scalar()
                print(f'Connected. PostgreSQL {version}\n')
            else:
                print(f'Connected. Dialect: {engine.dialect.name}\n')

            existing = set(inspect(engine).get_table_names())
            print(f'{"table":<24} {"rows":>8}')
            print('-' * 33)
            for table in db.metadata.sorted_tables:
                if table.name not in existing:
                    print(f'{table.name:<24} {"MISSING":>8}')
                    continue
                count = conn.execute(select(func.count()).select_from(table)).scalar()
                print(f'{table.name:<24} {count:>8}')
    except Exception as err:  # noqa: BLE001 - the message is the whole point
        print(f'FAILED: {type(err).__name__}: {err}\n')
        print('Common causes:')
        print('  - wrong database password (reset it under Settings -> Database)')
        print('  - password contains @ / # and was pasted un-encoded into the URI')
        print('    (use the SUPABASE_DB_* variables instead - they encode it for you)')
        print('  - the project is paused; open the Supabase dashboard to resume it')
        print('  - your network has no IPv6 route: use the pooler host on port 5432')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
