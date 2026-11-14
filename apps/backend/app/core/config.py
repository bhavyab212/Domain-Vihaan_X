# apps/backend/app/core/config.py
"""Application configuration loaded from environment variables and defaults."""

import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_PORT: int = 8000
    APP_HOST: str = "127.0.0.1"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    DEFAULT_OPERATING_MODE: str = "DEMO_MODE"
    DATABASE_URL: str = "sqlite:///./data/runtime/vihaan_x.db"

    ALLOWED_TARGET_DOMAINS: List[str] = ["localhost", "127.0.0.1", "mock-saas.local"]
    ISOLATION_SANDBOX_DIR: str = "./data/runtime/sandbox"

    GEMINI_API_KEY: str = ""
    HEXSTRIKE_MCP_URL: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
