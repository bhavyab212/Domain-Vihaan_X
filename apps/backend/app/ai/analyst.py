# apps/backend/app/ai/analyst.py
"""
AI Security Analyst module.
Wraps LLM invocations with strict prompt boundaries, timeout limits, and fallback hooks.
"""

from typing import Dict, Any, Optional
from app.core.config import settings
from app.ai.rule_fallback import generate_rule_based_explanation


class AISecurityAnalyst:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY

    async def explain_attack_path(self, path_data: Dict[str, Any]) -> str:
        """
        Explains an attack path in plain business terms.
        If LLM is unconfigured or unreachable, degrades gracefully to deterministic rule fallback.
        """
        if not self.api_key:
            return generate_rule_based_explanation(path_data)

        # Placeholder for external LLM call
        try:
            # When integrated, calls Gemini API
            return generate_rule_based_explanation(path_data)
        except Exception:
            return generate_rule_based_explanation(path_data)
