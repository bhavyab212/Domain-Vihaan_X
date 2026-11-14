# apps/backend/tests/test_demo_provider.py
"""
Unit tests for DemoScenarioProvider: validation, error handling, referential integrity.
"""

import json
import pytest
from pathlib import Path

from app.demo.provider import DemoScenarioProvider
from app.core.exceptions import DomainVihaanXException, ResourceNotFoundError


def test_load_canonical_scenario():
    """Verify provider loads and parses valid canonical scenario."""
    provider = DemoScenarioProvider()
    scenario = provider.load_scenario()
    assert scenario["scenarioId"] == "demo-scenario-saas-breach"
    assert len(scenario["assets"]) >= 3
    assert len(scenario["findings"]) >= 2
    assert len(scenario["relationships"]) >= 2


def test_scenario_missing_file_raises_not_found(tmp_path):
    """Verify ResourceNotFoundError when scenario.json is absent."""
    provider = DemoScenarioProvider(demo_data_path=tmp_path)
    with pytest.raises(ResourceNotFoundError) as exc_info:
        provider.load_scenario()
    assert "missing" in str(exc_info.value).lower()


def test_scenario_invalid_json_raises_domain_error(tmp_path):
    """Verify DomainVihaanXException on corrupted JSON."""
    bad_file = tmp_path / "scenario.json"
    bad_file.write_text("{ corrupt json: [", encoding="utf-8")
    provider = DemoScenarioProvider(demo_data_path=tmp_path)
    with pytest.raises(DomainVihaanXException) as exc_info:
        provider.load_scenario()
    assert "invalid json" in str(exc_info.value).lower()


def test_scenario_missing_required_keys_raises_domain_error(tmp_path):
    """Verify validation when required keys (e.g. 'findings') are missing."""
    incomplete = {
        "scenarioId": "test-scenario",
        "assets": [{"id": "a-1", "name": "test-asset", "type": "REPOSITORY"}]
        # missing findings and relationships
    }
    (tmp_path / "scenario.json").write_text(json.dumps(incomplete), encoding="utf-8")
    provider = DemoScenarioProvider(demo_data_path=tmp_path)
    with pytest.raises(DomainVihaanXException) as exc_info:
        provider.load_scenario()
    assert "missing required section" in str(exc_info.value).lower()


def test_scenario_referential_integrity_violation_raises(tmp_path):
    """Verify error when a finding references an asset that does not exist in the scenario."""
    invalid_refs = {
        "scenarioId": "test-invalid-refs",
        "assets": [{"id": "asset-valid-1", "name": "valid", "type": "REPOSITORY"}],
        "findings": [
            {
                "id": "f-1",
                "title": "Finding with ghost asset",
                "description": "Ghost",
                "severity": "HIGH",
                "assetId": "asset-ghost-999"  # Does not exist in assets
            }
        ],
        "relationships": []
    }
    (tmp_path / "scenario.json").write_text(json.dumps(invalid_refs), encoding="utf-8")
    provider = DemoScenarioProvider(demo_data_path=tmp_path)
    with pytest.raises(DomainVihaanXException) as exc_info:
        provider.load_scenario()
    assert "referential integrity failure" in str(exc_info.value).lower()
