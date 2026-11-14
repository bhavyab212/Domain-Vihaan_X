# apps/backend/app/ai/prompts/kill_chain.py
"""Structured prompts for cyber kill chain analysis and attack path narrative generation."""

ATTACK_PATH_EXPLANATION_PROMPT = """
You are an expert Cybersecurity Incident Responder and Architect explaining an identified attack path to an engineering team.
Analyze the following multi-hop traversal:
Entry Point: {entry_point}
Target: {target}
Steps:
{steps}

Instructions:
1. Provide an executive summary of the business risk in 2 sentences.
2. Detail how each hop enables the subsequent hop.
3. Identify the single most effective "choke point" remediation action that severs the path.
"""
