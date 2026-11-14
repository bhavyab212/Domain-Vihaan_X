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


def test_db_failure_preserves_prior_filesystem(tmp_path, test_db_session, monkeypatch):
    """
    Verify Fix A (filesystem/database atomicity):
    If database reseeding fails during reset_demo(), the prior filesystem workspace
    state MUST be completely restored from backup.
    """
    demo_data_dir = tmp_path / "data" / "demo"
    demo_data_dir.mkdir(parents=True)
    baseline_dir = demo_data_dir / "mock_saas"
    baseline_dir.mkdir()
    (baseline_dir / "baseline_file.txt").write_text("baseline data", encoding="utf-8")

    # Write a valid scenario
    scenario_dict = {
        "scenarioId": "test-atomic-reset",
        "assets": [{"id": "a-1", "name": "repo", "type": "REPOSITORY"}],
        "findings": [{"id": "f-1", "title": "t", "severity": "HIGH", "assetId": "a-1"}],
        "relationships": []
    }
    (demo_data_dir / "scenario.json").write_text(__import__("json").dumps(scenario_dict), encoding="utf-8")

    runtime_dir = tmp_path / "data" / "runtime"
    runtime_workspace = runtime_dir / "demo_workspace" / "mock_saas"
    runtime_workspace.mkdir(parents=True)
    canary_file = runtime_workspace / "canary_prior_state.txt"
    canary_file.write_text("pre-existing uncommitted work", encoding="utf-8")

    provider = DemoScenarioProvider(
        demo_data_path=demo_data_dir,
        runtime_workspace_path=runtime_workspace
    )
    provider.runtime_base_dir = runtime_dir

    # Force reseed_database to fail mid-operation
    def failing_reseed(db, scenario):
        raise RuntimeError("Simulated database failure during reset")

    monkeypatch.setattr(provider, "reseed_database", failing_reseed)

    with pytest.raises(Exception) as exc_info:
        provider.reset_demo(test_db_session)

    assert "demo reset aborted due to database failure" in str(exc_info.value).lower()
    # Verify canary file is still in active workspace!
    assert canary_file.exists()
    assert canary_file.read_text(encoding="utf-8") == "pre-existing uncommitted work"
    # Verify staging and backup directories are cleaned up
    assert not (runtime_dir / "demo_workspace" / "mock_saas_staging").exists()
    assert not (runtime_dir / "demo_workspace" / "mock_saas_backup").exists()


def test_sqlite_wal_failure_handling():
    """Verify Fix B: non-silent error handling on SQLite PRAGMA failure."""
    from app.database.session import set_sqlite_pragma
    from app.core.exceptions import ConfigurationError
    import sqlite3

    class FaultyCursor:
        def execute(self, sql):
            raise sqlite3.OperationalError("disk I/O error or readonly database")
        def close(self):
            pass

    class FaultySqliteConn(sqlite3.Connection):
        def cursor(self):
            return FaultyCursor()

    # Pass dummy connection that inherits sqlite3.Connection but fails cursor.execute
    fake_conn = FaultySqliteConn(":memory:")
    with pytest.raises(ConfigurationError) as exc_info:
        set_sqlite_pragma(fake_conn, None)
    assert "Failed to initialize SQLite with WAL mode" in str(exc_info.value)

