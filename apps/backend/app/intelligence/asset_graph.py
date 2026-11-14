# apps/backend/app/intelligence/asset_graph.py
"""
NetworkX-backed Business Security Graph model.
Builds and maintains nodes (Assets, Findings, Identities) and edges (Relationships).
"""

import networkx as nx
from typing import Dict, Any, List
from app.schemas.attack_path import SecurityGraphResponse, GraphNode, GraphEdge


class AssetSecurityGraph:
    def __init__(self):
        self.graph = nx.DiGraph()

    def add_asset_node(self, asset_id: str, label: str, data: Dict[str, Any] = None):
        self.graph.add_node(asset_id, label=label, type="ASSET", data=data or {})

    def add_finding_node(self, finding_id: str, label: str, severity: str, data: Dict[str, Any] = None):
        self.graph.add_node(finding_id, label=label, type="FINDING", severity=severity, data=data or {})

    def add_relationship(self, source: str, target: str, relationship: str, inferred: bool = False, confidence: float = 1.0):
        edge_id = f"{source}->{target}"
        self.graph.add_edge(source, target, id=edge_id, relationship=relationship, inferred=inferred, confidence=confidence)

    def to_schema(self) -> SecurityGraphResponse:
        nodes = []
        for node_id, attrs in self.graph.nodes(data=True):
            nodes.append(
                GraphNode(
                    id=node_id,
                    label=attrs.get("label", node_id),
                    type=attrs.get("type", "ASSET"),
                    severity=attrs.get("severity"),
                    data=attrs.get("data", {})
                )
            )

        edges = []
        for src, dst, attrs in self.graph.edges(data=True):
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

        return SecurityGraphResponse(nodes=nodes, edges=edges, updatedAt="2026-11-15T00:00:00Z")
