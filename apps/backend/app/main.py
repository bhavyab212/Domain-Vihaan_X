# apps/backend/app/main.py
"""
Domain-Vihaan_X Backend Application Entrypoint.
Initializes FastAPI, configures CORS middleware, registers centralized exception handlers,
and mounts the versioned API router.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging
from app.core.exceptions import (
    DomainVihaanXException,
    domain_exception_handler,
    http_exception_handler,
    generic_exception_handler,
)
from app.api.v1.router import api_v1_router

logger = setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and shutdown procedures."""
    logger.info(
        f"Starting Domain-Vihaan_X Control Plane [Env: {settings.APP_ENV}, Mode: {settings.DEFAULT_OPERATING_MODE}]"
    )
    # Safe startup: No blocking external network calls or scanner invocations
    yield
    logger.info("Shutting down Domain-Vihaan_X Control Plane cleanly.")


def create_application() -> FastAPI:
    """Application factory for FastAPI instance."""
    app = FastAPI(
        title="Domain-Vihaan_X API",
        description="Unified Cybersecurity Intelligence Platform Control Plane API for Software SMEs & SaaS Startups",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json"
    )

    # Centralized exception handlers
    app.add_exception_handler(DomainVihaanXException, domain_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount versioned API routes
    app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

    # Optional root convenience redirect / metadata
    @app.get("/", tags=["System"], include_in_schema=False)
    async def root():
        return {
            "name": "Domain-Vihaan_X Control Plane",
            "version": "0.1.0",
            "docs": "/docs",
            "health": f"{settings.API_V1_PREFIX}/health"
        }

    return app


app = create_application()
