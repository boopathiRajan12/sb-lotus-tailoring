"""
One-time data migration: copy every row from the old database into Supabase.

Reads with the project's own SQLAlchemy models, so values arrive already typed
(SQLite's 0/1 becomes a real bool, TEXT timestamps become datetimes) and the
tables are written parent-first, which keeps foreign keys satisfied. Columns
that don't exist in the source are skipped, so an older database that predates
`measurements` or `cancel_reason` still migrates.

Usage
-----
    # from the project root, with .env pointing at Supabase
    python scripts/migrate_to_supabase.py --source sqlite:///sb_lotus_tailoring.db
    python scripts/migrate_to_supabase.py \
        --source mysql+pymysql://root:Root@localhost:3306/sb_lotus_tailoring

    --dry-run   count the rows and stop, without writing anything
    --wipe      empty the destination tables first (destructive - it deletes
                every row already in Supabase, so only use it to re-run a
                migration that went wrong)
    --target    write somewhere other than the configured Supabase database
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, inspect, select, text  # noqa: E402

import models  # noqa: E402,F401  (imports every model onto db.metadata)
from models import db  # noqa: E402

BATCH_SIZE = 500


def normalise(url):
    """Accept the same URL shapes config.py does."""
    if url.startswith('postgres://'):
        url = 'postgresql://' + url[len('postgres://'):]
    if url.startswith('postgresql://'):
        url = 'postgresql+psycopg2://' + url[len('postgresql://'):]
    return url


def resolve_target(explicit):
    if explicit:
        return normalise(explicit)
    from config import Config
    return Config.SQLALCHEMY_DATABASE_URI


def safe_label(url):
    """The URL with its password masked, for printing."""
    if '@' not in url:
        return url
    creds, host = url.rsplit('@', 1)
    if ':' in creds:
        creds = creds.rsplit(':', 1)[0] + ':***'
    return f'{creds}@{host}'


def copy_table(table, source_engine, target_engine, source_columns, dry_run):
    """Copy one table. Returns the number of rows read."""
    shared = [c for c in table.columns if c.name in source_columns]
    missing = [c.name for c in table.columns if c.name not in source_columns]

    with source_engine.connect() as src:
        rows = src.execute(select(*shared)).fetchall()

    note = f'  (source lacks: {", ".join(missing)})' if missing else ''
    print(f'  {table.name:<22} {len(rows):>6} rows{note}')

    if dry_run or not rows:
        return len(rows)

    payload = [dict(row._mapping) for row in rows]
    with target_engine.begin() as dest:
        for start in range(0, len(payload), BATCH_SIZE):
            dest.execute(table.insert(), payload[start:start + BATCH_SIZE])
    return len(rows)


def reset_sequences(target_engine, tables):
    """Re-point each SERIAL sequence past the ids we just inserted.

    Rows are copied with their original primary keys, which leaves every
    sequence still sitting at 1 - the next insert would collide immediately.
    """
    if target_engine.dialect.name != 'postgresql':
        return
    print('\nResetting id sequences...')
    with target_engine.begin() as conn:
        for table in tables:
            if 'id' not in table.columns:
                continue
            conn.execute(text(
                f"SELECT setval(pg_get_serial_sequence('{table.name}', 'id'),"
                f"        COALESCE((SELECT MAX(id) FROM {table.name}), 0) + 1,"
                f"        false)"
            ))
    print('  done')


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--source', required=True,
                        help='SQLAlchemy URL of the database to copy FROM')
    parser.add_argument('--target', default=None,
                        help='SQLAlchemy URL to copy TO (default: the configured Supabase database)')
    parser.add_argument('--wipe', action='store_true',
                        help='DELETE every existing row in the target tables first')
    parser.add_argument('--dry-run', action='store_true',
                        help='report row counts without writing')
    args = parser.parse_args()

    source_url = normalise(args.source)
    target_url = resolve_target(args.target)

    print(f'Source: {safe_label(source_url)}')
    print(f'Target: {safe_label(target_url)}\n')

    source_engine = create_engine(source_url)
    target_engine = create_engine(target_url)

    # Parent tables first, so foreign keys always point at rows that exist.
    tables = list(db.metadata.sorted_tables)

    source_tables = set(inspect(source_engine).get_table_names())
    missing = [t.name for t in tables if t.name not in source_tables]
    if missing:
        print(f'Not present in the source, skipping: {", ".join(missing)}\n')

    if not args.dry_run:
        print('Ensuring the target schema exists...')
        db.metadata.create_all(target_engine)

        if args.wipe:
            print('Wiping target tables (children first)...')
            with target_engine.begin() as conn:
                for table in reversed(tables):
                    conn.execute(table.delete())

    print('Copying:')
    total = 0
    copied = []
    for table in tables:
        if table.name not in source_tables:
            continue
        source_columns = {c['name'] for c in inspect(source_engine).get_columns(table.name)}
        total += copy_table(table, source_engine, target_engine, source_columns, args.dry_run)
        copied.append(table)

    if args.dry_run:
        print(f'\nDry run: {total} rows would be copied. Nothing was written.')
        return

    reset_sequences(target_engine, copied)
    print(f'\nMigrated {total} rows into {safe_label(target_url)}.')
    print('Verify with: python scripts/db_check.py')


if __name__ == '__main__':
    main()
