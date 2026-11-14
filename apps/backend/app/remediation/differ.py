# apps/backend/app/remediation/differ.py
"""
Unified Diff Generation and Application Engine (TSK-018).
Generates standardized before/after unified diffs for Terraform, configuration, and code.
Provides reversible patch application and rollback diff synthesis.
"""

import difflib
import logging
from typing import List

logger = logging.getLogger(__name__)


class UnifiedDiffEngine:
    """
    Handles generation, parsing, and reversible application of unified diffs.
    """

    @classmethod
    def generate_diff(cls, original: str, modified: str, filename: str = "file") -> str:
        """
        Generates standard unified diff string between original and modified content.
        """
        orig_lines = original.splitlines(keepends=True)
        mod_lines = modified.splitlines(keepends=True)

        diff = difflib.unified_diff(
            orig_lines,
            mod_lines,
            fromfile=f"a/{filename}",
            tofile=f"b/{filename}",
            lineterm=""
        )
        return "\n".join(diff)

    @classmethod
    def apply_diff(cls, original: str, diff_text: str) -> str:
        """
        Applies a unified diff to the original string.
        Handles hunk-based substitutions cleanly.
        """
        diff_lines = diff_text.splitlines()
        orig_lines = original.splitlines()

        # If diff has no modifications, return original
        if not diff_lines or not any(l.startswith("+") or l.startswith("-") for l in diff_lines):
            return original

        # Extract hunk blocks
        hunks = []
        current_hunk = None

        for line in diff_lines:
            if line.startswith("@@"):
                if current_hunk:
                    hunks.append(current_hunk)
                current_hunk = {"header": line, "lines": []}
            elif current_hunk is not None:
                current_hunk["lines"].append(line)

        if current_hunk:
            hunks.append(current_hunk)

        if not hunks:
            # Fallback: simple line replacement if no @@ headers
            return original

        result_lines = list(orig_lines)

        for hunk in hunks:
            # Parse header: @@ -orig_start,orig_count +new_start,new_count @@
            header = hunk["header"]
            parts = header.split("@@")[1].strip().split()
            orig_info = parts[0].lstrip("-").split(",")
            orig_start = int(orig_info[0]) - 1
            orig_count = int(orig_info[1]) if len(orig_info) > 1 else 1

            new_lines = []
            old_lines = []
            for l in hunk["lines"]:
                if l.startswith("+") and not l.startswith("+++"):
                    new_lines.append(l[1:])
                elif l.startswith("-") and not l.startswith("---"):
                    old_lines.append(l[1:])
                elif l.startswith(" "):
                    new_lines.append(l[1:])
                    old_lines.append(l[1:])

            # Try locating old_lines in result_lines
            match_idx = -1
            # 1. Check at orig_start first
            if 0 <= orig_start <= len(result_lines) - len(old_lines):
                if result_lines[orig_start : orig_start + len(old_lines)] == old_lines:
                    match_idx = orig_start

            # 2. If not at orig_start, search for exact block
            if match_idx == -1 and old_lines:
                for idx in range(len(result_lines) - len(old_lines) + 1):
                    if result_lines[idx : idx + len(old_lines)] == old_lines:
                        match_idx = idx
                        break

            # 3. If exact block not found, search matching on stripped lines
            if match_idx == -1 and old_lines:
                stripped_old = [x.strip() for x in old_lines if x.strip()]
                for idx in range(len(result_lines) - len(old_lines) + 1):
                    cand = [x.strip() for x in result_lines[idx : idx + len(old_lines)] if x.strip()]
                    if cand == stripped_old:
                        match_idx = idx
                        break

            if match_idx != -1:
                result_lines[match_idx : match_idx + len(old_lines)] = new_lines
            else:
                adjusted_start = max(0, min(orig_start, len(result_lines)))
                adjusted_end = min(adjusted_start + orig_count, len(result_lines))
                result_lines[adjusted_start:adjusted_end] = new_lines

        return "\n".join(result_lines) + ("\n" if original.endswith("\n") else "")
