# apps/backend/app/main.py
"""
Domain-Vihaan_X Backend Application Entrypoint.
Initializes FastAPI, sets up CORS middleware, registers routers, and handles lifecycle.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging
from app.api.v1.router import api_v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and shutdown procedures."""
    logger = setup_logging()
    logger.info(f"Starting Domain-Vihaan_X Control Plane in {settings.DEFAULT_OPERATING_MODE} mode.")
    # Initialize database / runtime directories if needed
    yield
    logger.info("Shutting down Domain-Vihaan_X Control Plane.")


def create_application() -> FastAPI:
    """Application factory for FastAPI instance."""
    app = FastAPI(
        title="Domain-Vihaan_X API",
        description="Unified Cybersecurity Intelligence Platform Control Plane API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json"
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_v1_router, prefix="/api/v1")

    @app.get("/health", tags=["System"])
    async def health_check():
        """Root health check endpoint."""
        return {
            "status": "healthy",
            "version": "0.1.0",
            "mode": settings.DEFAULT_OPERATING_MODE
        }

    return app


app = create_application()
