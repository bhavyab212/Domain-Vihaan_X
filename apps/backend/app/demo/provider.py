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

from app.models.entities import AssetModel, FindingModel, RelationshipModel, AttackPathModel, RemediationModel
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

        valid_severities = {"CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"}

        # 1. Validate assets
        assets = scenario.get("assets", [])
        if not assets or not isinstance(assets, list):
            raise DomainVihaanXException("Canonical scenario contains no valid assets list.")

        asset_ids = set()
        for asset in assets:
            a_id = asset.get("id")
            if not a_id:
                raise DomainVihaanXException("Asset missing mandatory 'id' field.")
            if a_id in asset_ids:
                raise DomainVihaanXException(f"Duplicate asset ID '{a_id}' detected in scenario.")
            asset_ids.add(a_id)

            if not asset.get("name") or not asset.get("type"):
                raise DomainVihaanXException(f"Asset '{a_id}' missing mandatory name or type.")
            crit = asset.get("criticality")
            if crit and crit not in valid_severities:
                raise DomainVihaanXException(
                    f"Asset '{a_id}' has invalid criticality '{crit}'. Expected one of {valid_severities}"
                )

        # 2. Validate findings
        findings = scenario.get("findings", [])
        finding_ids = set()
        for finding in findings:
            f_id = finding.get("id")
            if not f_id:
                raise DomainVihaanXException("Finding missing mandatory 'id' field.")
            if f_id in finding_ids:
                raise DomainVihaanXException(f"Duplicate finding ID '{f_id}' detected in scenario.")
            finding_ids.add(f_id)

            f_asset = finding.get("assetId")
            if not f_asset or f_asset not in asset_ids:
                raise DomainVihaanXException(
                    f"Referential integrity failure: finding '{f_id}' references unknown asset '{f_asset}'"
                )

            sev = finding.get("severity")
            if not sev or sev not in valid_severities:
                raise DomainVihaanXException(
                    f"Finding '{f_id}' has invalid severity '{sev}'. Expected one of {valid_severities}"
                )

            cvss = finding.get("cvssScore")
            if cvss is not None:
                if not (0.0 <= float(cvss) <= 10.0):
                    raise DomainVihaanXException(
                        f"Finding '{f_id}' cvssScore {cvss} out of bounds [0.0, 10.0]."
                    )

        # 3. Validate relationships
        relationships = scenario.get("relationships", [])
        rel_ids = set()
        for rel in relationships:
            r_id = rel.get("id")
            if not r_id:
                raise DomainVihaanXException("Relationship missing mandatory 'id' field.")
            if r_id in rel_ids:
                raise DomainVihaanXException(f"Duplicate relationship ID '{r_id}' detected in scenario.")
            rel_ids.add(r_id)

            src, tgt = rel.get("source"), rel.get("target")
            if not src or src not in asset_ids or not tgt or tgt not in asset_ids:
                raise DomainVihaanXException(
                    f"Referential integrity failure: relationship '{r_id}' references unknown asset ({src} -> {tgt})"
                )

            conf = rel.get("confidence")
            if conf is not None:
                if not (0.0 <= float(conf) <= 1.0):
                    raise DomainVihaanXException(
                        f"Relationship '{r_id}' confidence {conf} out of bounds [0.0, 1.0]."
                    )

        # 4. Validate attack paths
        attack_paths = scenario.get("attackPaths", [])
        path_ids = set()
        for path in attack_paths:
            p_id = path.get("id")
            if not p_id:
                raise DomainVihaanXException("Attack path missing mandatory 'id' field.")
            if p_id in path_ids:
                raise DomainVihaanXException(f"Duplicate attack path ID '{p_id}' detected in scenario.")
            path_ids.add(p_id)

            entry_asset = path.get("entryPointAssetId")
            if not entry_asset or entry_asset not in asset_ids:
                raise DomainVihaanXException(
                    f"Referential integrity failure: attack path '{p_id}' entryPointAssetId '{entry_asset}' not found in assets."
                )

            crown_asset = path.get("crownJewelAssetId")
            if not crown_asset or crown_asset not in asset_ids:
                raise DomainVihaanXException(
                    f"Referential integrity failure: attack path '{p_id}' crownJewelAssetId '{crown_asset}' not found in assets."
                )

            p_sev = path.get("severity")
            if p_sev and p_sev not in valid_severities:
                raise DomainVihaanXException(
                    f"Attack path '{p_id}' has invalid severity '{p_sev}'. Expected one of {valid_severities}"
                )

            p_conf = path.get("confidenceScore")
            if p_conf is not None:
                if not (0.0 <= float(p_conf) <= 1.0):
                    raise DomainVihaanXException(
                        f"Attack path '{p_id}' confidenceScore {p_conf} out of bounds [0.0, 1.0]."
                    )

            steps = path.get("steps")
            if not steps or not isinstance(steps, list):
                raise DomainVihaanXException(
                    f"Attack path '{p_id}' must contain a non-empty list of steps."
                )

            for step_idx, step in enumerate(steps, start=1):
                s_asset = step.get("assetId")
                if not s_asset or s_asset not in asset_ids:
                    raise DomainVihaanXException(
                        f"Referential integrity failure: attack path '{p_id}' step {step_idx} references unknown asset '{s_asset}'"
                    )

                s_find = step.get("findingId")
                if s_find and s_find not in finding_ids:
                    raise DomainVihaanXException(
                        f"Referential integrity failure: attack path '{p_id}' step {step_idx} references unknown finding '{s_find}'"
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
            db.query(RemediationModel).filter(RemediationModel.is_demo.is_(True)).delete(synchronize_session=False)
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
        Validates scenario, performs two-phase filesystem staging with atomic swap,
        reseeds database transactionally with automatic rollback on DB failure,
        and strictly verifies SQLite WAL mode.
        """
        start_time = time.perf_counter()

        # Step 1: Validate scenario strictly
        scenario = self.load_scenario()

        # Step 2: Stage filesystem in isolated staging location
        if not self.baseline_fixtures_path.exists():
            raise ResourceNotFoundError(
                f"Baseline synthetic fixtures missing at {self.baseline_fixtures_path}"
            )

        active_path = self.runtime_workspace_path.resolve()
        runtime_root = self.runtime_base_dir.resolve()
        try:
            active_path.relative_to(runtime_root)
        except ValueError:
            raise DomainVihaanXException(
                f"Path traversal detected: destination {active_path} escapes {runtime_root}"
            )

        parent_dir = active_path.parent
        parent_dir.mkdir(parents=True, exist_ok=True)

        staging_path = parent_dir / f"{active_path.name}_staging"
        backup_path = parent_dir / f"{active_path.name}_backup"

        # Clean prior staging/backup if left over
        if staging_path.exists():
            shutil.rmtree(staging_path)
        if backup_path.exists():
            shutil.rmtree(backup_path)

        # Copy baseline to staging
        shutil.copytree(self.baseline_fixtures_path, staging_path)

        # Atomic swap phase 1: backup active workspace if exists
        prior_active_existed = active_path.exists()
        if prior_active_existed:
            active_path.rename(backup_path)

        # Atomic swap phase 2: move staging to active
        staging_path.rename(active_path)

        # Step 3: Reseed database transactionally with filesystem rollback guarantee
        try:
            counts = self.reseed_database(db, scenario)
            wal_status = verify_sqlite_wal(db)
            if not wal_status.get("wal_active", False) or not wal_status.get("foreign_keys_enabled", False):
                raise DomainVihaanXException(
                    f"SQLite WAL verification failed: {wal_status}"
                )

            # Reseed and verification succeeded - clean up backup
            if backup_path.exists():
                shutil.rmtree(backup_path)

        except Exception as exc:
            # Reseed failed: rollback database and restore filesystem to prior state
            db.rollback()
            if active_path.exists():
                shutil.rmtree(active_path)
            if prior_active_existed and backup_path.exists():
                backup_path.rename(active_path)
            if staging_path.exists():
                shutil.rmtree(staging_path)
            raise DomainVihaanXException(
                f"Demo reset aborted due to database failure. Prior state restored: {exc}"
            ) from exc

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
            runtimeWorkspace=str(active_path),
            durationMs=round(duration_ms, 2),
            walVerified=wal_status.get("wal_active", False),
            resetAt=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        )
