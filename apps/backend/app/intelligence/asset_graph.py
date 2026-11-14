# apps/backend/app/intelligence/asset_graph.py
"""
NetworkX-backed Business Security Graph Engine.
Constructs directed topology graphs from database entities (assets, findings, relationships),
calculates graph metrics, ensures deterministic sorting, and exports to canonical API schemas.
"""

import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import networkx as nx
from sqlalchemy.orm import Session

from app.models.entities import AssetModel, FindingModel, RelationshipModel
from app.schemas.attack_path import SecurityGraphResponse, GraphNode, GraphEdge


class AssetSecurityGraph:
    """
    Directed graph representing assets and their topological trust relationships.
    """

    def __init__(self):
        self.graph = nx.DiGraph()

    def add_asset_node(
        self,
        asset_id: str,
        label: str,
        severity: Optional[str] = "MEDIUM",
        data: Optional[Dict[str, Any]] = None
    ) -> None:
        """Adds an asset node to the graph."""
        self.graph.add_node(
            asset_id,
            label=label,
            type="ASSET",
            severity=severity,
            data=data or {}
        )

    def add_finding_node(
        self,
        finding_id: str,
        label: str,
        severity: str,
        data: Optional[Dict[str, Any]] = None
    ) -> None:
        """Adds a security finding node to the graph."""
        self.graph.add_node(
            finding_id,
            label=label,
            type="FINDING",
            severity=severity,
            data=data or {}
        )

    def add_relationship(
        self,
        source: str,
        target: str,
        relationship: str,
        inferred: bool = False,
        confidence: Optional[float] = 1.0,
        edge_id: Optional[str] = None
    ) -> None:
        """Adds a directed relationship edge between two nodes."""
        eid = edge_id or f"{source}->{target}"
        self.graph.add_edge(
            source,
            target,
            id=eid,
            relationship=relationship,
            inferred=inferred,
            confidence=confidence
        )

    @classmethod
    def build_from_database(
        cls,
        db: Session,
        include_finding_nodes: bool = False
    ) -> "AssetSecurityGraph":
        """
        Populates a directed security graph from the active database session.
        Aggregates finding metadata onto asset nodes for unified risk visualization.
        """
        sg = cls()

        # Query all assets and findings
        assets: List[AssetModel] = db.query(AssetModel).all()
        findings: List[FindingModel] = db.query(FindingModel).all()
        relationships: List[RelationshipModel] = db.query(RelationshipModel).all()

        # Map findings per asset
        findings_by_asset: Dict[str, List[FindingModel]] = {}
        for f in findings:
            findings_by_asset.setdefault(f.asset_id, []).append(f)

        # 1. Add Asset Nodes
        for a in assets:
            a_findings = findings_by_asset.get(a.id, [])
            
            # Compute highest finding severity on this asset
            highest_sev = a.criticality or "MEDIUM"
            sev_weights = {"CRITICAL": 5, "HIGH": 4, "MEDIUM": 3, "LOW": 2, "INFORMATIONAL": 1}
            max_weight = sev_weights.get(highest_sev, 3)
            for f in a_findings:
                f_weight = sev_weights.get(f.severity, 1)
                if f_weight > max_weight:
                    max_weight = f_weight
                    highest_sev = f.severity

            metadata = {}
            if a.metadata_json:
                try:
                    metadata = json.loads(a.metadata_json)
                except Exception:
                    metadata = {}

            node_data = {
                "type": a.type,
                "environment": a.environment,
                "criticality": a.criticality,
                "owner": a.owner,
                "metadata": metadata,
                "findingsCount": len(a_findings),
                "isDemo": a.is_demo,
            }

            sg.add_asset_node(
                asset_id=a.id,
                label=a.name,
                severity=highest_sev,
                data=node_data
            )

        # 2. Add Relationship Edges between Assets
        for r in relationships:
            # Ensure both source and target exist in graph
            if sg.graph.has_node(r.source_id) and sg.graph.has_node(r.target_id):
                sg.add_relationship(
                    source=r.source_id,
                    target=r.target_id,
                    relationship=r.relationship,
                    inferred=r.inferred,
                    confidence=r.confidence,
                    edge_id=r.id
                )

        # 3. Optionally add Finding Nodes and EXPOSES edges
        if include_finding_nodes:
            for f in findings:
                if sg.graph.has_node(f.asset_id):
                    sg.add_finding_node(
                        finding_id=f.id,
                        label=f.title,
                        severity=f.severity,
                        data={
                            "scanner": f.scanner,
                            "cvssScore": f.cvss_score,
                            "cveId": f.cve_id,
                            "status": f.status,
                            "assetId": f.asset_id
                        }
                    )
                    sg.add_relationship(
                        source=f.asset_id,
                        target=f.id,
                        relationship="EXPOSES",
                        inferred=False,
                        confidence=1.0,
                        edge_id=f"rel-exp-{f.id}"
                    )

        return sg

    def to_schema(self) -> SecurityGraphResponse:
        """
        Exports the NetworkX graph to the canonical SecurityGraphResponse schema.
        Ensures strictly deterministic ordering of nodes and edges.
        """
        nodes: List[GraphNode] = []
        for node_id in sorted(self.graph.nodes()):
            attrs = self.graph.nodes[node_id]
            nodes.append(
                GraphNode(
                    id=node_id,
                    label=attrs.get("label", node_id),
                    type=attrs.get("type", "ASSET"),
                    severity=attrs.get("severity"),
                    data=attrs.get("data", {})
                )
            )

        edges: List[GraphEdge] = []
        for src, dst in sorted(self.graph.edges(), key=lambda edge: (edge[0], edge[1])):
            attrs = self.graph.edges[src, dst]
            edges.append(
                GraphEdge(
                    id=attrs.get("id", f"{src}->{dst}"),
                    source=src,
                    target=dst,
                    relationship=attrs.get("relationship", "DEPENDS_ON"),
                    inferred=attrs.get("inferred", False),
                    confidence=attrs.get("confidence")
                )
            )

        updated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        return SecurityGraphResponse(nodes=nodes, edges=edges, updatedAt=updated_at)
