# apps/backend/tests/test_attack_path.py
"""
Unit and integration tests for AttackPathEngine:
Validates bounded DFS traversal, cycle safety, deterministic ordering, confidence compounding,
and the GET /api/v1/attack-paths endpoint.
"""

import pytest
import networkx as nx
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database.session import init_db, get_db
from app.intelligence.attack_path import AttackPathEngine
from app.demo.provider import DemoScenarioProvider
from app.schemas.attack_path import AttackPathResponse


@pytest.fixture
def attack_path_db_session(tmp_path):
    """Provides test DB seeded with canonical demo scenario."""
    db_file = tmp_path / "test_attack_paths.db"
    test_engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False}
    )
    init_db(test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()

    provider = DemoScenarioProvider()
    scenario = provider.load_scenario()
    provider.reseed_database(session, scenario)

    try:
        yield session
    finally:
        session.close()


def test_bounded_dfs_cycle_safety():
    """Verify cycle in graph (A -> B -> C -> A, C -> Target) does not cause infinite loop."""
    g = nx.DiGraph()
    g.add_edge("A", "B")
    g.add_edge("B", "C")
    g.add_edge("C", "A")  # Cycle back to A
    g.add_edge("C", "Target")

    engine = AttackPathEngine(g)
    paths = engine.bounded_dfs_paths(source="A", target="Target", max_depth=5, max_paths=10)

    assert len(paths) == 1
    assert paths[0] == ["A", "B", "C", "Target"]


def test_bounded_dfs_depth_and_path_limits():
    """Verify max_depth and max_paths bounds are strictly enforced."""
    g = nx.DiGraph()
    # Linear chain of 8 nodes: N0 -> N1 -> ... -> N7
    for i in range(7):
        g.add_edge(f"N{i}", f"N{i+1}")

    engine = AttackPathEngine(g)
    # Search with max_depth=4 when path length would be 8
    shallow_paths = engine.bounded_dfs_paths("N0", "N7", max_depth=4)
    assert len(shallow_paths) == 0

    # Search with adequate depth
    deep_paths = engine.bounded_dfs_paths("N0", "N7", max_depth=10)
    assert len(deep_paths) == 1
    assert len(deep_paths[0]) == 8


def test_deterministic_neighbor_ordering():
    """Verify DFS visits branching neighbors in deterministic alphabetical order."""
    g = nx.DiGraph()
    # Node S branches to Z and A; both connect to T
    g.add_edge("S", "Z")
    g.add_edge("S", "A")
    g.add_edge("Z", "T")
    g.add_edge("A", "T")

    engine = AttackPathEngine(g)
    paths = engine.bounded_dfs_paths("S", "T", max_depth=5, max_paths=10)

    assert len(paths) == 2
    # Alphabetical order: S -> A -> T should be discovered first before S -> Z -> T
    assert paths[0] == ["S", "A", "T"]
    assert paths[1] == ["S", "Z", "T"]


def test_confidence_score_compounding():
    """Verify confidence values on edges compound along the path."""
    g = nx.DiGraph()
    g.add_node("entry", label="Public Repo", data={"type": "REPOSITORY", "criticality": "HIGH"})
    g.add_node("pivot", label="IAM Role", data={"type": "CLOUD_ACCOUNT", "criticality": "HIGH"})
    g.add_node("crown", label="PII Vault", data={"type": "DATABASE", "criticality": "CRITICAL"})

    g.add_edge("entry", "pivot", confidence=0.95)
    g.add_edge("pivot", "crown", confidence=0.90)

    engine = AttackPathEngine(g)
    res = engine.build_attack_path_response(["entry", "pivot", "crown"], path_id="test-p1")

    # 0.95 * 0.90 = 0.855 -> rounded to 0.85 via round-half-to-even
    assert res.confidenceScore == 0.85
    assert res.severity == "CRITICAL"
    assert len(res.steps) == 3
    assert res.steps[0].technique == "Exploit Public-Facing Application (T1190)"
    assert res.steps[1].technique == "Valid Accounts (T1078)"
    assert res.steps[2].technique == "Data from Cloud Storage Object (T1530)"


def test_get_attack_paths_persisted_endpoint(attack_path_db_session):
    """Verify GET /api/v1/attack-paths returns persisted canonical demo attack path."""
    def override_get_db():
        try:
            yield attack_path_db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    try:
        response = client.get("/api/v1/attack-paths")
        assert response.status_code == 200
        paths = response.json()
        assert len(paths) >= 1
        canonical_path = paths[0]
        assert canonical_path["id"] == "path-01"
        assert canonical_path["severity"] == "CRITICAL"
        assert canonical_path["entryPointAssetId"] == "asset-repo-01"
        assert canonical_path["crownJewelAssetId"] == "asset-storage-01"
        assert len(canonical_path["steps"]) == 3

        # Test severity filter
        res_filter = client.get("/api/v1/attack-paths?severity=CRITICAL")
        assert res_filter.status_code == 200
        assert len(res_filter.json()) >= 1

        res_empty = client.get("/api/v1/attack-paths?severity=INFORMATIONAL")
        assert res_empty.status_code == 200
        assert len(res_empty.json()) == 0

        # Test live graph discovery
        res_discover = client.get("/api/v1/attack-paths?discover=true")
        assert res_discover.status_code == 200
        disc_paths = res_discover.json()
        assert len(disc_paths) >= 2
        crown_jewel_ids = {p["crownJewelAssetId"] for p in disc_paths}
        assert "asset-cloud-01" in crown_jewel_ids
        assert "asset-storage-01" in crown_jewel_ids
        # Find path reaching final storage vault
        storage_path = next(p for p in disc_paths if p["crownJewelAssetId"] == "asset-storage-01")
        assert storage_path["entryPointAssetId"] == "asset-repo-01"
        assert len(storage_path["steps"]) == 3
    finally:
        app.dependency_overrides.clear()
