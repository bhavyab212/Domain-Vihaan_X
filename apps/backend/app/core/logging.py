# apps/backend/app/core/logging.py
"""Structured logging configuration for Domain-Vihaan_X."""

import logging
import sys
from app.core.config import settings


def setup_logging() -> logging.Logger:
    logger = logging.getLogger("vihaan_x")
    if not logger.handlers:
        level_name = getattr(settings, "LOG_LEVEL", "INFO").upper()
        log_level = getattr(logging, level_name, logging.INFO)
        logger.setLevel(log_level)
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    return logger
