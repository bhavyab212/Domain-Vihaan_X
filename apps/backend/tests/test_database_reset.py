# apps/backend/tests/test_database_reset.py
"""
Unit tests for database WAL mode, foreign keys, scoped reset isolation, and idempotency.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.session import verify_sqlite_wal, init_db
from app.models.entities import AssetModel, FindingModel, RelationshipModel, AttackPathModel
from app.demo.provider import DemoScenarioProvider


@pytest.fixture
def test_db_session(tmp_path):
    """Provides an isolated test database with WAL mode and foreign keys."""
    db_file = tmp_path / "test_vihaan.db"
    test_engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False}
    )

    # Listeners are attached globally to Engine in app.database.session
    init_db(test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_sqlite_wal_and_foreign_keys_active(test_db_session):
    """Verify ADR-005 requirements: SQLite WAL mode and foreign keys enabled."""
    status = verify_sqlite_wal(test_db_session)
    assert status["wal_active"] is True
    assert status["journal_mode"] == "wal"
    assert status["foreign_keys_enabled"] is True


def test_scoped_reset_preserves_non_demo_records(test_db_session):
    """
    Verify critical safety rule:
    Demo reset MUST NOT delete live assessment or production records.
    """
    provider = DemoScenarioProvider()
    scenario = provider.load_scenario()

    # Pre-seed a non-demo (live assessment) record
    live_asset = AssetModel(
        id="asset-live-production-001",
        name="real-production-api",
        type="API_ENDPOINT",
        environment="PRODUCTION",
        criticality="CRITICAL",
        owner="SecOps",
        is_demo=False  # Live record!
    )
    test_db_session.add(live_asset)
    test_db_session.commit()

    # Perform demo reset
    provider.reseed_database(test_db_session, scenario)

    # Assert live record is still intact
    live_check = test_db_session.query(AssetModel).filter(AssetModel.id == "asset-live-production-001").first()
    assert live_check is not None
    assert live_check.is_demo is False

    # Assert demo records were seeded
    demo_count = test_db_session.query(AssetModel).filter(AssetModel.is_demo.is_(True)).count()
    assert demo_count == len(scenario["assets"])


def test_demo_reset_idempotency(test_db_session):
    """Verify calling reseed repeatedly does not create duplicate rows."""
    provider = DemoScenarioProvider()
    scenario = provider.load_scenario()

    # Run reset 3 times consecutively
    provider.reseed_database(test_db_session, scenario)
    provider.reseed_database(test_db_session, scenario)
    counts = provider.reseed_database(test_db_session, scenario)

    assert counts["assets"] == len(scenario["assets"])
    assert test_db_session.query(AssetModel).filter(AssetModel.is_demo.is_(True)).count() == len(scenario["assets"])
    assert test_db_session.query(FindingModel).filter(FindingModel.is_demo.is_(True)).count() == len(scenario["findings"])
    assert test_db_session.query(RelationshipModel).filter(RelationshipModel.is_demo.is_(True)).count() == len(scenario["relationships"])
