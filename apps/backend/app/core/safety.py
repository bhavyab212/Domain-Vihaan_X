# apps/backend/app/core/safety.py
"""
Safety and security boundary enforcement.
Guarantees that assessments only execute against pre-authorized targets,
scanner parameters are strictly validated, and no arbitrary shell strings are constructed.
"""

import re
import os
import tempfile
from pathlib import Path
from typing import List, Optional
from app.core.config import settings


class SecurityBoundaryError(Exception):
    """Raised when an operation violates security boundaries or target allowlists."""
    pass


def get_project_root() -> Path:
    """Locates the repository root."""
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / "data").exists() and (parent / "apps").exists():
            return parent
    return current.parents[3]


def validate_target_path(
    path_str: str | Path,
    extra_allowed_roots: Optional[List[Path]] = None
) -> Path:
    r"""
    Validates that a local filesystem scan target is strictly within authorized workspaces.
    Blocks arbitrary system paths (e.g. /etc, C:\Windows) and path traversal attempts.
    """
    if not path_str:
        raise SecurityBoundaryError("Target path cannot be empty.")

    target = Path(path_str).resolve()

    # Disallow known sensitive system locations immediately
    target_str_lower = str(target).lower()
    system_prohibitions = [
        "c:\\windows", "c:\\winnt", "c:\\program files",
        "/etc", "/root", "/var", "/bin", "/sbin", "/usr", "/sys", "/proc"
    ]
    for sys_path in system_prohibitions:
        if target_str_lower.startswith(sys_path):
            raise SecurityBoundaryError(
                f"Security Boundary Violation: Scan target '{target}' is a restricted system location."
            )

    # Allowed roots: Project Root, data/runtime sandbox, system temp dir
    project_root = get_project_root().resolve()
    temp_dir = Path(tempfile.gettempdir()).resolve()
    
    allowed_roots = [project_root, temp_dir]
    if extra_allowed_roots:
        allowed_roots.extend([p.resolve() for p in extra_allowed_roots])

    # Check confinement
    is_confined = False
    for root in allowed_roots:
        try:
            target.relative_to(root)
            is_confined = True
            break
        except ValueError:
            continue

    if not is_confined:
        raise SecurityBoundaryError(
            f"Security Boundary Violation: Scan target '{target}' escapes authorized project roots."
        )

    return target


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
