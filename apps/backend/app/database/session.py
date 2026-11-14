# apps/backend/app/database/session.py
"""
Database engine, session factory, and SQLite WAL mode configuration.
Enforces ADR-005 (SQLite WAL mode + foreign keys) with safe directory initialization.
"""

import os
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from app.models.base import Base

# Ensure parent directory for SQLite database exists safely
if settings.DATABASE_URL.startswith("sqlite"):
    db_path_str = settings.DATABASE_URL.replace("sqlite:///", "")
    if db_path_str and db_path_str != ":memory:":
        db_path = Path(db_path_str).resolve()
        db_path.parent.mkdir(parents=True, exist_ok=True)


engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """
    Enforces SQLite Write-Ahead Logging (WAL) mode and Foreign Key constraints
    as mandated by ADR-005.
    """
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA foreign_keys=ON;")
    except Exception:
        pass
    finally:
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db(target_engine: Engine = engine):
    """Initializes all database tables declared in SQLAlchemy models."""
    Base.metadata.create_all(bind=target_engine)


def verify_sqlite_wal(db_session: Session) -> dict:
    """
    Verifies that SQLite WAL mode and foreign keys are active.
    Returns status dictionary with empirical verification results.
    """
    connection = db_session.connection()
    journal_mode = connection.exec_driver_sql("PRAGMA journal_mode;").scalar()
    foreign_keys = connection.exec_driver_sql("PRAGMA foreign_keys;").scalar()
    return {
        "journal_mode": str(journal_mode).lower(),
        "foreign_keys_enabled": bool(foreign_keys == 1),
        "wal_active": bool(str(journal_mode).lower() == "wal")
    }


def get_db():
    """FastAPI dependency provider for database sessions."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
