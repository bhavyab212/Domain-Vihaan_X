# apps/backend/app/ai/rule_fallback.py
"""
Deterministic Rule-Based Security Analyst Fallback.
Implements ADR-012 to guarantee 100% offline and resilient demo execution without any external LLM dependencies.
"""

from typing import Dict, Any


def generate_rule_based_explanation(path_data: Dict[str, Any]) -> str:
    """
    Synthesizes a structured business explanation using deterministic graph heuristics and templates.
    """
    title = path_data.get("title", "Identified Attack Path")
    entry = path_data.get("entryPointAssetId", "External Surface")
    crown = path_data.get("crownJewelAssetId", "Sensitive Data Store")
    steps = path_data.get("steps", [])

    explanation = (
        f"**Deterministic Risk Analysis:**\n\n"
        f"- **Threat Traversal:** An unauthorized entity targeting `{entry}` can traverse internal credentials and permissions to reach `{crown}`.\n"
        f"- **Traversal Depth:** {len(steps)} verified intermediate pivot points detected.\n"
        f"- **Business Impact:** High likelihood of unauthenticated data exfiltration or cloud resource compromise.\n"
        f"- **Recommended Mitigation:** Sever the attack path at the earliest pivot point by revoking exposed credentials and applying least-privilege IAM policies."
    )
    return explanation
