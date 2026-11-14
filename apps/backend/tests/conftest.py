# apps/backend/tests/conftest.py
"""
Pytest configuration and test fixtures for Domain-Vihaan_X Backend.
"""

import pytest
import os
import sys
from pathlib import Path

# Add apps/backend directory to sys.path so app modules are discoverable
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from fastapi.testclient import TestClient
from app.main import create_application


@pytest.fixture(scope="session")
def app():
    """Create a fresh test application instance."""
    return create_application()


@pytest.fixture(scope="session")
def client(app):
    """Provide a TestClient instance for API tests."""
    with TestClient(app) as test_client:
        yield test_client
