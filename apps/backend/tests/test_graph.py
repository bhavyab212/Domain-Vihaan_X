# apps/backend/tests/test_graph.py
"""
Unit and integration tests for NetworkX Business Security Graph and GET /api/v1/graph endpoint.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database.session import init_db, get_db
from app.intelligence.asset_graph import AssetSecurityGraph
from app.demo.provider import DemoScenarioProvider
from app.schemas.attack_path import SecurityGraphResponse


@pytest.fixture
def graph_db_session(tmp_path):
    """Isolated database session with canonical demo scenario seeded."""
    db_file = tmp_path / "test_graph.db"
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


def test_asset_graph_direct_construction():
    """Verify manual node and edge insertion and deterministic sorting in to_schema()."""
    sg = AssetSecurityGraph()
    # Add nodes in reverse order
    sg.add_asset_node("asset-z", "Zeta Asset", severity="LOW")
    sg.add_asset_node("asset-a", "Alpha Asset", severity="CRITICAL")
    sg.add_relationship("asset-z", "asset-a", "DEPENDS_ON", edge_id="rel-z-a")

    schema = sg.to_schema()
    assert isinstance(schema, SecurityGraphResponse)
    assert len(schema.nodes) == 2
    # Verify deterministic alphabetical sorting by ID
    assert schema.nodes[0].id == "asset-a"
    assert schema.nodes[1].id == "asset-z"
    assert len(schema.edges) == 1
    assert schema.edges[0].source == "asset-z"
    assert schema.edges[0].target == "asset-a"


def test_build_from_database(graph_db_session):
    """Verify building graph from database entities."""
    sg = AssetSecurityGraph.build_from_database(graph_db_session, include_finding_nodes=False)
    schema = sg.to_schema()

    # In canonical demo scenario: 3 assets and 2 relationships
    assert len(schema.nodes) == 3
    node_ids = [n.id for n in schema.nodes]
    assert "asset-repo-01" in node_ids
    assert "asset-cloud-01" in node_ids
    assert "asset-storage-01" in node_ids

    assert len(schema.edges) == 2
    edge_sources = {(e.source, e.target) for e in schema.edges}
    assert ("asset-repo-01", "asset-cloud-01") in edge_sources
    assert ("asset-cloud-01", "asset-storage-01") in edge_sources

    # Check that repo node has findingCount and severity
    repo_node = next(n for n in schema.nodes if n.id == "asset-repo-01")
    assert repo_node.data.get("findingsCount", 0) >= 1
    assert repo_node.severity == "CRITICAL"


def test_build_from_database_with_findings(graph_db_session):
    """Verify include_finding_nodes=True adds finding nodes and EXPOSES edges."""
    sg = AssetSecurityGraph.build_from_database(graph_db_session, include_finding_nodes=True)
    schema = sg.to_schema()

    finding_nodes = [n for n in schema.nodes if n.type == "FINDING"]
    assert len(finding_nodes) >= 2

    exposes_edges = [e for e in schema.edges if e.relationship == "EXPOSES"]
    assert len(exposes_edges) >= 2


def test_get_security_graph_endpoint(graph_db_session):
    """Verify GET /api/v1/graph returns 200 and schema-valid response."""
    def override_get_db():
        try:
            yield graph_db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    try:
        response = client.get("/api/v1/graph")
        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data
        assert "edges" in data
        assert "updatedAt" in data
        assert len(data["nodes"]) >= 3
        assert len(data["edges"]) >= 2

        # Test query parameter include_findings=true
        response_with_findings = client.get("/api/v1/graph?include_findings=true")
        assert response_with_findings.status_code == 200
        data_findings = response_with_findings.json()
        assert len(data_findings["nodes"]) > len(data["nodes"])
    finally:
        app.dependency_overrides.clear()
