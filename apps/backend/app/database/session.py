# apps/backend/app/database/session.py
"""
Database engine, session factory, and SQLite WAL mode configuration.
Enforces ADR-005 (SQLite WAL mode + foreign keys) with safe directory initialization
and non-silent error handling.
"""

import os
import sqlite3
import logging
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from app.core.exceptions import ConfigurationError
from app.models.base import Base

logger = logging.getLogger("vihaan_x")

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
    as mandated by ADR-005. Does not silently ignore failures on SQLite connections.
    """
    # Restrict PRAGMA configuration to SQLite connections only
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL;")
            cursor.execute("PRAGMA foreign_keys=ON;")
        except Exception as exc:
            logger.error(f"Critical failure setting SQLite PRAGMA journal_mode/foreign_keys: {exc}")
            raise ConfigurationError(
                f"Failed to initialize SQLite with WAL mode and foreign keys: {exc}"
            ) from exc
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
    wal_active = bool(str(journal_mode).lower() == "wal")
    fk_enabled = bool(foreign_keys == 1)
    
    return {
        "journal_mode": str(journal_mode).lower(),
        "foreign_keys_enabled": fk_enabled,
        "wal_active": wal_active
    }


def get_db():
    """FastAPI dependency provider for database sessions."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
