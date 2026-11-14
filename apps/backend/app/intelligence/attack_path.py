# apps/backend/app/intelligence/attack_path.py
"""
Attack Path Traversal Engine.
Implements bounded, cycle-safe directed DFS path discovery across the Business Security Graph.
Traverses from external/untrusted entry points to crown jewels with deterministic sorting,
MITRE ATT&CK correlation, and confidence scoring.
"""

import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Set
import networkx as nx
from sqlalchemy.orm import Session

from app.models.entities import AttackPathModel, AssetModel, FindingModel
from app.schemas.attack_path import AttackPathResponse, AttackPathStep


def attack_path_model_to_response(model: AttackPathModel) -> AttackPathResponse:
    """Converts a persisted database AttackPathModel entity into canonical AttackPathResponse schema."""
    steps_data = []
    if model.steps_json:
        try:
            steps_data = json.loads(model.steps_json)
        except Exception:
            steps_data = []

    steps = [AttackPathStep(**s) for s in steps_data]
    created_at_str = (
        model.created_at.isoformat().replace("+00:00", "Z")
        if hasattr(model.created_at, "isoformat")
        else str(model.created_at)
    )

    return AttackPathResponse(
        id=model.id,
        title=model.title,
        summary=model.summary,
        severity=model.severity,
        confidenceScore=model.confidence_score,
        isSimulated=model.is_simulated,
        entryPointAssetId=model.entry_point_asset_id,
        crownJewelAssetId=model.crown_jewel_asset_id,
        steps=steps,
        status=model.status,
        createdAt=created_at_str
    )


class AttackPathEngine:
    """
    Graph intelligence engine for multi-hop attack path traversal and discovery.
    """

    def __init__(self, graph: nx.DiGraph):
        self.graph = graph

    def bounded_dfs_paths(
        self,
        source: str,
        target: str,
        max_depth: int = 5,
        max_paths: int = 10
    ) -> List[List[str]]:
        """
        Bounded, cycle-preventing Directed Depth-First Search.
        Visits successors in deterministic alphabetical order to guarantee reproducible output.
        """
        if not self.graph.has_node(source) or not self.graph.has_node(target):
            return []

        discovered_paths: List[List[str]] = []

        def dfs(current: str, path: List[str], visited: Set[str]):
            if len(discovered_paths) >= max_paths:
                return
            if len(path) > max_depth:
                return

            if current == target and len(path) > 1:
                discovered_paths.append(list(path))
                return

            # Deterministic neighbor traversal
            successors = sorted(list(self.graph.successors(current)))
            for neighbor in successors:
                if neighbor not in visited:
                    visited.add(neighbor)
                    path.append(neighbor)
                    dfs(neighbor, path, visited)
                    path.pop()
                    visited.remove(neighbor)

        dfs(source, [source], {source})
        return discovered_paths

    def build_attack_path_response(
        self,
        node_path: List[str],
        path_id: str,
        db_findings_map: Optional[Dict[str, List[FindingModel]]] = None,
        is_simulated: bool = False
    ) -> AttackPathResponse:
        """
        Constructs a fully enriched AttackPathResponse from a sequence of asset node IDs.
        Calculates compounded path confidence and maps MITRE ATT&CK techniques.
        """
        steps: List[AttackPathStep] = []
        path_confidence = 1.0
        findings_on_path: List[FindingModel] = []

        total_hops = len(node_path)
        for idx, node_id in enumerate(node_path, start=1):
            node_attrs = self.graph.nodes.get(node_id, {})
            node_label = node_attrs.get("label", node_id)
            node_type = node_attrs.get("data", {}).get("type", "ASSET")

            # Link finding if present for this asset
            associated_finding = None
            if db_findings_map and node_id in db_findings_map:
                asset_findings = db_findings_map[node_id]
                if asset_findings:
                    associated_finding = asset_findings[0]
                    findings_on_path.append(associated_finding)

            finding_id = associated_finding.id if associated_finding else None

            # Determine MITRE Tactic and Technique based on hop position
            if idx == 1:
                tactic = "Initial Access"
                technique = "Exploit Public-Facing Application (T1190)"
                if associated_finding and associated_finding.scanner == "gitleaks":
                    tactic = "Credential Access"
                    technique = "Unsecured Credentials (T1552.001)"
                desc = f"Attacker leverages initial exposure on {node_label} ({node_type})"
            elif idx == total_hops:
                tactic = "Exfiltration"
                technique = "Data from Cloud Storage Object (T1530)"
                desc = f"Attacker compromises crown jewel {node_label} and accesses critical data"
            else:
                tactic = "Privilege Escalation"
                technique = "Valid Accounts (T1078)"
                desc = f"Attacker leverages permissions on {node_label} to pivot toward crown jewel"

            steps.append(
                AttackPathStep(
                    stepNumber=idx,
                    assetId=node_id,
                    findingId=finding_id,
                    description=desc,
                    technique=technique,
                    mitreTactic=tactic
                )
            )

        # Compound edge confidences along the path
        for i in range(len(node_path) - 1):
            u, v = node_path[i], node_path[i + 1]
            edge_data = self.graph.get_edge_data(u, v, default={})
            edge_conf = edge_data.get("confidence", 0.95)
            if edge_conf is not None:
                path_confidence *= float(edge_conf)

        # Clamp confidence score
        confidence_score = round(max(0.50, min(0.99, path_confidence)), 2)

        # Determine path severity
        target_node = node_path[-1]
        target_attrs = self.graph.nodes.get(target_node, {})
        target_crit = target_attrs.get("data", {}).get("criticality", "CRITICAL")

        has_critical_finding = any(f.severity == "CRITICAL" for f in findings_on_path)
        if target_crit == "CRITICAL" or has_critical_finding:
            severity = "CRITICAL"
        else:
            severity = "HIGH"

        entry_name = self.graph.nodes.get(node_path[0], {}).get("label", node_path[0])
        crown_name = self.graph.nodes.get(node_path[-1], {}).get("label", node_path[-1])

        created_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        return AttackPathResponse(
            id=path_id,
            title=f"Attack Vector: {entry_name} -> {crown_name}",
            summary=f"Discovered {len(steps)}-step traversal from entry asset '{entry_name}' to crown jewel '{crown_name}'.",
            severity=severity,
            confidenceScore=confidence_score,
            isSimulated=is_simulated,
            entryPointAssetId=node_path[0],
            crownJewelAssetId=node_path[-1],
            steps=steps,
            status="ACTIVE",
            createdAt=created_at
        )

    def discover_attack_paths(
        self,
        db_findings_map: Optional[Dict[str, List[FindingModel]]] = None,
        max_depth: int = 5,
        max_paths: int = 10
    ) -> List[AttackPathResponse]:
        """
        Scans graph for all viable multi-hop attack vectors from potential entry points
        to critical assets/crown jewels.
        """
        entry_points: List[str] = []
        crown_jewels: List[str] = []

        for node_id, attrs in self.graph.nodes(data=True):
            data = attrs.get("data", {})
            asset_type = data.get("type", "")
            crit = data.get("criticality", "")

            # Entry point heuristic: repositories, public domains, web apps, API endpoints, or in-degree 0
            if (
                asset_type in {"REPOSITORY", "DOMAIN", "WEB_APPLICATION", "API_ENDPOINT"}
                or self.graph.in_degree(node_id) == 0
            ):
                entry_points.append(node_id)

            # Crown jewel heuristic: database, storage vault, cloud account with CRITICAL severity
            if crit == "CRITICAL" or asset_type in {"DATABASE", "STORAGE"}:
                crown_jewels.append(node_id)

        # Deterministic sorting of candidates
        entry_points = sorted(list(set(entry_points)))
        crown_jewels = sorted(list(set(crown_jewels)))

        paths: List[AttackPathResponse] = []
        path_counter = 1

        for entry in entry_points:
            for jewel in crown_jewels:
                if entry == jewel:
                    continue
                node_paths = self.bounded_dfs_paths(
                    source=entry,
                    target=jewel,
                    max_depth=max_depth,
                    max_paths=max_paths - len(paths)
                )
                for np in node_paths:
                    ap = self.build_attack_path_response(
                        node_path=np,
                        path_id=f"discovered-path-{path_counter:02d}",
                        db_findings_map=db_findings_map,
                        is_simulated=False
                    )
                    paths.append(ap)
                    path_counter += 1
                    if len(paths) >= max_paths:
                        return paths

        return paths
