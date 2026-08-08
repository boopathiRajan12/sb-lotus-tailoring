"""
Database initialization.
Creates the SQLAlchemy instance used by all models.
"""
from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def utcnow():
    """Current UTC time as a naive datetime.

    `datetime.utcnow()` is deprecated from Python 3.12, but its replacement
    (`datetime.now(timezone.utc)`) returns an *aware* datetime, and every
    timestamp column here is a plain `DateTime` holding naive UTC. Mixing the
    two raises on comparison, so the offset is dropped here to keep the whole
    codebase on one convention.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
