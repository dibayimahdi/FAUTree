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
                        "failureMechanism": "Open circuit",
                        "effect": "No flow",
                        "cause": "Motor burnout",
                        "component": "Driver IC",
                        "safetyMechanism": "Current monitor",
                        "faultTreeEventId": "e1",
                        "failureRateFit": 10.0,
                        "dangerous": True,
                        "diagnosticCoveragePercent": 30.0,
                        "faultClassification": "SPF",
                        "latent": False,
                        "severity": 9,
                        "occurrence": 3,
                        "detectability": 4,
                    }
                ],
            }
        )

        self.assertEqual(len(project.fmea), 1)
        self.assertEqual(project.fmea[0].item_function, "Pump")
        self.assertEqual(project.fmea[0].component, "Driver IC")
        self.assertEqual(project.fmea[0].failure_mechanism, "Open circuit")
        self.assertEqual(project.fmea[0].safety_mechanism, "Current monitor")
        self.assertEqual(project.fmea[0].fault_tree_event_id, "e1")
        self.assertEqual(project.fmea[0].failure_rate_fit, 10.0)
        self.assertTrue(project.fmea[0].dangerous)
        self.assertEqual(project.fmea[0].diagnostic_coverage_percent, 30.0)
        self.assertEqual(project.fmea[0].fault_classification, "SPF")
        self.assertFalse(project.fmea[0].latent)
        self.assertEqual(project.fmea[0].lambda_dd, 3.0)
        self.assertEqual(project.fmea[0].lambda_du, 7.0)
        self.assertEqual(project.to_dict()["fmea"][0]["lambdaTotal"], 10.0)
        self.assertAlmostEqual(project.to_dict()["fmea"][0]["diagnosticCoverage"], 0.3)
        self.assertEqual(project.fmea[0].detectability, 4)
        self.assertEqual(project.to_dict()["fmea"][0]["rpn"], 108)

    def test_fault_tree_project_rejects_invalid_fmeda_fit(self) -> None:
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
                        "failureRateFit": -0.1,
                    }
                ],
            }
        )

        self.assertIn("FMEDA row row-1 has invalid failureRateFit.", project.validate())

    def test_fault_tree_project_migrates_legacy_lambda_buckets_to_fit_and_dc(self) -> None:
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
                        "lambdaDD": 3.0,
                        "lambdaDU": 7.0,
                    }
                ],
            }
        )

        self.assertEqual(project.fmea[0].failure_rate_fit, 10.0)
        self.assertTrue(project.fmea[0].dangerous)
        self.assertEqual(project.fmea[0].diagnostic_coverage_percent, 30.0)
        self.assertEqual(project.fmea[0].lambda_dd, 3.0)
        self.assertEqual(project.fmea[0].lambda_du, 7.0)


if __name__ == "__main__":
    unittest.main()
