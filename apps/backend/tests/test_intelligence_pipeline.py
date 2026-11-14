# apps/backend/tests/test_intelligence_pipeline.py
"""
End-to-end cross-pipeline integration test for Domain-Vihaan_X backend intelligence:
Reset -> Normalize Heterogeneous Scans -> Graph Topological Assembly -> Bounded DFS Attack Paths -> API Validation.
"""

import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database.session import init_db, get_db
from app.models.entities import FindingModel
from app.demo.provider import DemoScenarioProvider
from app.intelligence.normalizer import FindingNormalizer

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def integration_db_session(tmp_path):
    """Provides isolated SQLite database session."""
    db_file = tmp_path / "test_pipeline.db"
    test_engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False}
    )
    init_db(test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_full_intelligence_pipeline_lifecycle(integration_db_session, tmp_path):
    """
    Simulates complete operator workflow:
    1. One-click demo reset.
    2. Normalize raw scanner outputs across Gitleaks, Checkov, Trivy, Subfinder.
    3. Ingest normalized findings into database.
    4. Query Business Security Graph API and verify node-link topology.
    5. Query Attack Paths API and verify multi-hop traversal to crown jewel.
    """
    def override_get_db():
        try:
            yield integration_db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    try:
        # Step 1: Execute One-Click Demo Reset
        provider = DemoScenarioProvider(runtime_workspace_path=tmp_path / "mock_saas")
        provider.runtime_base_dir = tmp_path
        reset_res = provider.reset_demo(integration_db_session)
        assert reset_res.status == "RESET_SUCCESSFUL"
        assert reset_res.assetsCount >= 3
        assert reset_res.walVerified is True

        # Step 2: Normalize heterogeneous scanner outputs
        gitleaks_raw = json.loads((FIXTURES_DIR / "gitleaks_output.json").read_text(encoding="utf-8"))
        checkov_raw = json.loads((FIXTURES_DIR / "checkov_output.json").read_text(encoding="utf-8"))
        trivy_raw = json.loads((FIXTURES_DIR / "trivy_output.json").read_text(encoding="utf-8"))
        subfinder_raw = json.loads((FIXTURES_DIR / "subfinder_output.json").read_text(encoding="utf-8"))

        gitleaks_findings = FindingNormalizer.normalize("gitleaks", gitleaks_raw, "asset-repo-01").findings
        checkov_findings = FindingNormalizer.normalize("checkov", checkov_raw, "asset-cloud-01").findings
        trivy_findings = FindingNormalizer.normalize("trivy", trivy_raw, "asset-repo-01").findings
        subfinder_findings = FindingNormalizer.normalize("subfinder", subfinder_raw, "asset-repo-01").findings

        all_normalized = gitleaks_findings + checkov_findings + trivy_findings + subfinder_findings
        assert len(all_normalized) >= 6

        # Step 3: Ingest newly normalized findings into database
        for fn in all_normalized:
            loc_dict = fn.location.model_dump() if fn.location else {}
            # Deduplicate by ID if already exists
            existing = integration_db_session.query(FindingModel).filter(FindingModel.id == fn.id).first()
            if not existing:
                finding_entity = FindingModel(
                    id=fn.id,
                    title=fn.title,
                    description=fn.description,
                    severity=fn.severity,
                    scanner=fn.scanner,
                    asset_id=fn.assetId,
                    cve_id=fn.cveId,
                    cvss_score=fn.cvssScore,
                    provenance=fn.provenance,
                    location_json=json.dumps(loc_dict),
                    remediation_guidance=fn.remediationGuidance,
                    status=fn.status,
                    is_demo=True
                )
                integration_db_session.add(finding_entity)
        integration_db_session.commit()

        # Step 4: Query Business Security Graph
        graph_response = client.get("/api/v1/graph")
        assert graph_response.status_code == 200
        graph_data = graph_response.json()
        assert len(graph_data["nodes"]) == 3
        assert len(graph_data["edges"]) == 2

        repo_node = next(n for n in graph_data["nodes"] if n["id"] == "asset-repo-01")
        assert repo_node["severity"] == "CRITICAL"
        assert repo_node["data"]["findingsCount"] >= 1

        # Step 5: Query Attack Paths Endpoint
        paths_response = client.get("/api/v1/attack-paths")
        assert paths_response.status_code == 200
        paths = paths_response.json()
        assert len(paths) >= 1
        assert paths[0]["entryPointAssetId"] == "asset-repo-01"
        assert paths[0]["crownJewelAssetId"] == "asset-storage-01"

        # Step 6: Query Dynamic Discovery
        discover_response = client.get("/api/v1/attack-paths?discover=true")
        assert discover_response.status_code == 200
        disc_paths = discover_response.json()
        assert len(disc_paths) >= 2

        # Step 7: Filter by Severity
        crit_response = client.get("/api/v1/attack-paths?severity=CRITICAL")
        assert crit_response.status_code == 200
        for p in crit_response.json():
            assert p["severity"] == "CRITICAL"

    finally:
        app.dependency_overrides.clear()
