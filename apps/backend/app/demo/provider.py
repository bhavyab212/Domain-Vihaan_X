# apps/backend/app/demo/provider.py
"""
Deterministic Demo Scenario Provider and One-Click Reset Engine.
Restores synthetic test environment, validates canonical scenario integrity,
and manages scoped database reseeding with SQLite WAL transactional safety.
"""

import os
import json
import time
import shutil
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.models.entities import AssetModel, FindingModel, RelationshipModel, AttackPathModel
from app.database.session import init_db, verify_sqlite_wal
from app.schemas.demo import DemoResetResponse
from app.core.exceptions import DomainVihaanXException, ResourceNotFoundError


def _find_project_root() -> Path:
    """Finds the repository root by locating the data/ directory."""
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / "data" / "demo").exists():
            return parent
    # Fallback to 4 levels up
    return current.parents[3]


class DemoScenarioProvider:
    """
    Manages canonical synthetic demonstration data and provides
    sub-second, idempotent resets to the pristine demonstration baseline.
    """

    def __init__(
        self,
        demo_data_path: Path | None = None,
        runtime_workspace_path: Path | None = None
    ):
        base_dir = _find_project_root()
        self.demo_data_path = demo_data_path or (base_dir / "data" / "demo")
        self.runtime_base_dir = base_dir / "data" / "runtime"
        self.runtime_workspace_path = runtime_workspace_path or (
            self.runtime_base_dir / "demo_workspace" / "mock_saas"
        )
        self.baseline_fixtures_path = self.demo_data_path / "mock_saas"

    def load_scenario(self) -> Dict[str, Any]:
        """
        Loads and strictly validates the canonical scenario manifest.
        Raises DomainVihaanXException if file is missing, malformed, or has broken references.
        """
        scenario_file = self.demo_data_path / "scenario.json"
        if not scenario_file.exists():
            raise ResourceNotFoundError(
                f"Canonical scenario manifest missing at {scenario_file}"
            )

        try:
            with open(scenario_file, "r", encoding="utf-8") as f:
                scenario = json.load(f)
        except json.JSONDecodeError as exc:
            raise DomainVihaanXException(
                f"Invalid JSON in canonical demo scenario: {exc}"
            ) from exc

        # Validate mandatory top-level keys
        required_keys = ["scenarioId", "assets", "findings", "relationships"]
        for key in required_keys:
            if key not in scenario:
                raise DomainVihaanXException(
                    f"Scenario manifest missing required section: '{key}'"
                )

        # Validate referential integrity between assets, findings, and relationships
        asset_ids = {asset["id"] for asset in scenario.get("assets", []) if "id" in asset}
        if not asset_ids:
            raise DomainVihaanXException("Canonical scenario contains no valid assets.")

        for finding in scenario.get("findings", []):
            f_asset = finding.get("assetId")
            if not f_asset or f_asset not in asset_ids:
                raise DomainVihaanXException(
                    f"Referential integrity failure: finding '{finding.get('id')}' references unknown asset '{f_asset}'"
                )

        for rel in scenario.get("relationships", []):
            src, tgt = rel.get("source"), rel.get("target")
            if src not in asset_ids or tgt not in asset_ids:
                raise DomainVihaanXException(
                    f"Referential integrity failure: relationship '{rel.get('id')}' references unknown asset ({src} -> {tgt})"
                )

        return scenario

    def restore_synthetic_filesystem(self) -> Path:
        """
        Restores runtime working copy of synthetic SaaS codebase from the immutable baseline fixtures.
        Guarantees path confinement within data/runtime/ to prevent path traversal attacks.
        """
        if not self.baseline_fixtures_path.exists():
            raise ResourceNotFoundError(
                f"Baseline synthetic fixtures missing at {self.baseline_fixtures_path}"
            )

        # Enforce sandbox confinement: destination must resolve within runtime_base_dir
        dest = self.runtime_workspace_path.resolve()
        runtime_root = self.runtime_base_dir.resolve()
        try:
            dest.relative_to(runtime_root)
        except ValueError:
            raise DomainVihaanXException(
                f"Path traversal detected: destination {dest} escapes {runtime_root}"
            )

        # Safely wipe and re-create destination
        if dest.exists():
            shutil.rmtree(dest)
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(self.baseline_fixtures_path, dest)

        return dest

    def reseed_database(self, db: Session, scenario: Dict[str, Any]) -> Dict[str, int]:
        """
        Performs scoped transactional database reset:
        Frees old demo records without touching non-demo/live assessment data,
        then seeds canonical demo records with explicit SIMULATED_DEMO provenance.
        """
        init_db(db.bind)

        try:
            # 1. Scoped removal of existing demo records (preserves live assessment data)
            db.query(FindingModel).filter(FindingModel.is_demo.is_(True)).delete(synchronize_session=False)
            db.query(RelationshipModel).filter(RelationshipModel.is_demo.is_(True)).delete(synchronize_session=False)
            db.query(AttackPathModel).filter(AttackPathModel.is_demo.is_(True)).delete(synchronize_session=False)
            db.query(AssetModel).filter(AssetModel.is_demo.is_(True)).delete(synchronize_session=False)
            db.flush()

            # 2. Insert canonical assets
            asset_models = []
            for a in scenario.get("assets", []):
                asset_models.append(
                    AssetModel(
                        id=a["id"],
                        name=a["name"],
                        type=a["type"],
                        environment=a.get("environment", "PRODUCTION"),
                        criticality=a.get("criticality", "MEDIUM"),
                        owner=a.get("owner", "Engineering"),
                        metadata_json=json.dumps(a.get("metadata", {})),
                        is_demo=True,
                    )
                )
            db.add_all(asset_models)
            db.flush()

            # 3. Insert canonical findings with explicit SIMULATED_DEMO provenance
            finding_models = []
            for f in scenario.get("findings", []):
                finding_models.append(
                    FindingModel(
                        id=f["id"],
                        title=f["title"],
                        description=f["description"],
                        severity=f["severity"],
                        scanner=f.get("scanner", "synthetic"),
                        asset_id=f["assetId"],
                        cve_id=f.get("cveId"),
                        cvss_score=f.get("cvssScore"),
                        provenance="SIMULATED_DEMO",
                        location_json=json.dumps(f.get("location", {})),
                        remediation_guidance=f.get("remediationGuidance"),
                        status=f.get("status", "OPEN"),
                        is_demo=True,
                    )
                )
            db.add_all(finding_models)

            # 4. Insert canonical relationships
            rel_models = []
            for r in scenario.get("relationships", []):
                rel_models.append(
                    RelationshipModel(
                        id=r["id"],
                        source_id=r["source"],
                        target_id=r["target"],
                        relationship=r["relationship"],
                        inferred=r.get("inferred", False),
                        confidence=r.get("confidence", 1.0),
                        is_demo=True,
                    )
                )
            db.add_all(rel_models)

            # 5. Insert canonical attack paths
            path_models = []
            for p in scenario.get("attackPaths", []):
                path_models.append(
                    AttackPathModel(
                        id=p["id"],
                        title=p["title"],
                        summary=p["summary"],
                        severity=p["severity"],
                        confidence_score=p.get("confidenceScore", 0.95),
                        is_simulated=True,
                        entry_point_asset_id=p["entryPointAssetId"],
                        crown_jewel_asset_id=p["crownJewelAssetId"],
                        steps_json=json.dumps(p.get("steps", [])),
                        status=p.get("status", "ACTIVE"),
                        is_demo=True,
                    )
                )
            db.add_all(path_models)

            db.commit()

            return {
                "assets": len(asset_models),
                "findings": len(finding_models),
                "relationships": len(rel_models),
                "attack_paths": len(path_models),
            }
        except Exception as e:
            db.rollback()
            raise DomainVihaanXException(f"Database reset transaction failed: {e}") from e

    def reset_demo(self, db: Session) -> DemoResetResponse:
        """
        Executes full deterministic demo reset:
        Validates scenario, restores runtime fixtures, seeds database, and verifies WAL.
        """
        start_time = time.perf_counter()

        # Step 1: Validate scenario
        scenario = self.load_scenario()

        # Step 2: Restore runtime synthetic files
        restored_path = self.restore_synthetic_filesystem()

        # Step 3: Reseed database transactionally
        counts = self.reseed_database(db, scenario)

        # Step 4: Verify SQLite WAL status
        wal_status = verify_sqlite_wal(db)

        duration_ms = (time.perf_counter() - start_time) * 1000.0

        return DemoResetResponse(
            status="RESET_SUCCESSFUL",
            scenarioId=scenario.get("scenarioId", "demo-scenario-saas-breach"),
            mode="DEMO_MODE",
            message="Demo scenario reset to canonical synthetic baseline.",
            assetsCount=counts["assets"],
            findingsCount=counts["findings"],
            relationshipsCount=counts["relationships"],
            attackPathsCount=counts["attack_paths"],
            runtimeWorkspace=str(restored_path),
            durationMs=round(duration_ms, 2),
            walVerified=wal_status.get("wal_active", False),
            resetAt=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        )
