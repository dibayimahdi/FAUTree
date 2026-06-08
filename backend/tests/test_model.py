from __future__ import annotations

import unittest

from backend.fautree.core.model import AnalysisSettings, FaultTreeProject


class AnalysisSettingsTests(unittest.TestCase):
    def test_analysis_settings_include_reliability_horizon(self) -> None:
        settings = AnalysisSettings(
            mission_time_hours=43800.0,
            time_unit="hours",
            reliability_x_min_hours=0.0,
            reliability_x_max_hours=35.0,
            reliability_y_min=-0.1,
            reliability_y_max=1.2,
        )

        self.assertEqual(settings.to_dict()["missionTimeHours"], 43800.0)
        self.assertEqual(settings.to_dict()["timeUnit"], "hours")
        self.assertEqual(settings.to_dict()["reliabilityXAxisMinHours"], 0.0)
        self.assertEqual(settings.to_dict()["reliabilityXAxisMaxHours"], 35.0)
        self.assertEqual(settings.to_dict()["reliabilityYAxisMin"], -0.1)
        self.assertEqual(settings.to_dict()["reliabilityYAxisMax"], 1.2)

    def test_fault_tree_project_round_trips_reliability_settings(self) -> None:
        project = FaultTreeProject.from_dict(
            {
                "schemaVersion": "0.1.0",
                "project": {"id": "demo", "name": "Demo"},
                "analysis": {
                    "quantification": "rare-event-approximation",
                    "variableOrdering": "infix",
                    "missionTimeHours": 7200,
                    "timeUnit": "hours",
                    "reliabilityXAxisMinHours": 0,
                    "reliabilityXAxisMaxHours": 35,
                    "reliabilityYAxisMin": -0.1,
                    "reliabilityYAxisMax": 1.2,
                },
                "nodes": [],
                "edges": [],
            }
        )

        self.assertEqual(project.analysis.mission_time_hours, 7200.0)
        self.assertEqual(project.analysis.time_unit, "hours")
        self.assertEqual(project.analysis.reliability_x_min_hours, 0.0)
        self.assertEqual(project.analysis.reliability_x_max_hours, 35.0)
        self.assertEqual(project.analysis.reliability_y_min, -0.1)
        self.assertEqual(project.analysis.reliability_y_max, 1.2)
        self.assertEqual(project.analysis.to_dict()["missionTimeHours"], 7200.0)

    def test_fault_tree_project_round_trips_fmea_rows(self) -> None:
        project = FaultTreeProject.from_dict(
            {
                "schemaVersion": "0.1.0",
                "project": {"id": "demo", "name": "Demo"},
                "analysis": {},
                "nodes": [],
                "edges": [],
                "fmea": [
                    {
                        "id": "row-1",
                        "itemFunction": "Pump",
                        "failureMode": "Stops",
                        "effect": "No flow",
                        "cause": "Motor burnout",
                        "severity": 9,
                        "occurrence": 3,
                        "detectability": 4,
                    }
                ],
            }
        )

        self.assertEqual(len(project.fmea), 1)
        self.assertEqual(project.fmea[0].item_function, "Pump")
        self.assertEqual(project.fmea[0].detectability, 4)
        self.assertEqual(project.to_dict()["fmea"][0]["rpn"], 108)


if __name__ == "__main__":
    unittest.main()
