# apps/backend/app/core/logging.py
"""Structured logging configuration for Domain-Vihaan_X."""

import logging
import sys


def setup_logging() -> logging.Logger:
    logger = logging.getLogger("vihaan_x")
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    return logger
