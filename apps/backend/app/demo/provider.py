# apps/backend/app/demo/provider.py
"""
Demo scenario provider.
Loads pre-seeded deterministic scenario data from data/demo/scenario.json
and ensures all simulated findings carry explicit SIMULATED provenance.
"""

import json
from pathlib import Path
from typing import Dict, Any, List


class DemoScenarioProvider:
    def __init__(self, demo_data_path: Path = None):
        self.demo_data_path = demo_data_path or Path(__file__).resolve().parents[3] / "data" / "demo"

    def load_scenario(self) -> Dict[str, Any]:
        """Loads canonical synthetic demo scenario."""
        scenario_file = self.demo_data_path / "scenario.json"
        if not scenario_file.exists():
            return {
                "name": "Fallback Canonical Demo Scenario",
                "assets": [],
                "findings": [],
                "relationships": [],
                "attackPaths": []
            }
        with open(scenario_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_assets(self) -> List[Dict[str, Any]]:
        scenario = self.load_scenario()
        return scenario.get("assets", [])

    def get_findings(self) -> List[Dict[str, Any]]:
        scenario = self.load_scenario()
        return scenario.get("findings", [])

    def get_attack_paths(self) -> List[Dict[str, Any]]:
        scenario = self.load_scenario()
        return scenario.get("attackPaths", [])
