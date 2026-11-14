# apps/backend/app/core/config.py
"""Application configuration loaded from environment variables and defaults."""

import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


class Settings(BaseSettings):
    APP_ENV: str = Field(default="development", description="Application environment")
    APP_PORT: int = Field(default=8000, description="Listening port")
    APP_HOST: str = Field(default="127.0.0.1", description="Listening host (localhost only for security)")
    API_V1_PREFIX: str = Field(default="/api/v1", description="Prefix for V1 REST endpoints")
    LOG_LEVEL: str = Field(default="INFO", description="Log level")

    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173"],
        description="Allowed frontend origin URLs for CORS"
    )

    # Operating Mode: DEMO_MODE or LIVE_ASSESSMENT_MODE
    DEFAULT_OPERATING_MODE: str = Field(
        default="DEMO_MODE",
        description="Default operating mode: DEMO_MODE or LIVE_ASSESSMENT_MODE"
    )

    # Proposed persistence placeholder (Pending ADR-005 formal acceptance)
    DATABASE_URL: str = Field(
        default="sqlite:///./data/runtime/vihaan_x.db",
        description="Proposed database connection URI"
    )

    ALLOWED_TARGET_DOMAINS: List[str] = Field(
        default=["localhost", "127.0.0.1", "mock-saas.local"],
        description="Strict target allowlist for security scans"
    )
    ISOLATION_SANDBOX_DIR: str = Field(
        default="./data/runtime/sandbox",
        description="Directory for isolated scanner outputs"
    )

    # Optional external integrations
    GEMINI_API_KEY: str = Field(default="", description="Optional Google Gemini API key")
    HEXSTRIKE_MCP_URL: str = Field(default="", description="Optional HexStrike local URL")

    @field_validator("DEFAULT_OPERATING_MODE")
    @classmethod
    def validate_operating_mode(cls, v: str) -> str:
        if v not in ["DEMO_MODE", "LIVE_ASSESSMENT_MODE"]:
            raise ValueError("DEFAULT_OPERATING_MODE must be either DEMO_MODE or LIVE_ASSESSMENT_MODE")
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
