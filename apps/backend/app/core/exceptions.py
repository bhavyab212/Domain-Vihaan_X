# apps/backend/app/core/exceptions.py
"""
Centralized exception definitions and FastAPI exception handlers.
Provides consistent structured error responses across all API endpoints.
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging

logger = logging.getLogger("vihaan_x")


class DomainVihaanXException(Exception):
    """Base domain exception for Domain-Vihaan_X."""
    def __init__(self, message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class ResourceNotFoundError(DomainVihaanXException):
    def __init__(self, message: str = "Requested resource not found"):
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND)


class SecurityBoundaryViolationError(DomainVihaanXException):
    def __init__(self, message: str = "Security boundary violation"):
        super().__init__(message, status_code=status.HTTP_403_FORBIDDEN)


class ConfigurationError(DomainVihaanXException):
    def __init__(self, message: str = "Invalid system configuration"):
        super().__init__(message, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


async def domain_exception_handler(request: Request, exc: DomainVihaanXException) -> JSONResponse:
    """Handles all internal domain exceptions."""
    logger.error(f"Domain error [{request.method} {request.url.path}]: {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.__class__.__name__,
            "message": exc.message,
            "path": request.url.path
        }
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handles standard HTTP exceptions with structured formatting."""
    logger.warning(f"HTTP {exc.status_code} [{request.method} {request.url.path}]: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "HTTPException",
            "message": exc.detail,
            "path": request.url.path
        }
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all unhandled exception handler to avoid crashing and hide sensitive stack traces."""
    logger.exception(f"Unhandled server error on {request.method} {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected internal server error occurred.",
            "path": request.url.path
        }
    )
