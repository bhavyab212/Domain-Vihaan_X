# apps/backend/app/core/safety.py
"""
Safety and security boundary enforcement.
Guarantees that assessments only execute against pre-authorized targets,
scanner parameters are strictly validated, and no arbitrary shell strings are constructed.
"""

import re
from typing import List
from app.core.config import settings


class SecurityBoundaryError(Exception):
    """Raised when an operation violates security boundaries or target allowlists."""
    pass


def validate_target_domain(domain: str) -> bool:
    """
    Validates that a target domain or IP is within the configured allowlist.
    Prevents unauthorized internet-wide scanning.
    """
    if not domain or not isinstance(domain, str):
        raise SecurityBoundaryError("Invalid target: target cannot be empty.")
    
    clean_domain = domain.strip().lower()
    
    # Check against allowlist
    if clean_domain in [d.lower() for d in settings.ALLOWED_TARGET_DOMAINS]:
        return True
        
    raise SecurityBoundaryError(
        f"Security Boundary Violation: Target '{domain}' is not in the authorized target allowlist."
    )


def sanitize_input_string(value: str, max_length: int = 255) -> str:
    """
    Sanitizes string inputs to avoid injection patterns.
    """
    if not value or not isinstance(value, str):
        return ""
    # Strip dangerous characters for CLI parameters
    sanitized = re.sub(r"[;&|`$<>]", "", value)
    return sanitized[:max_length].strip()
