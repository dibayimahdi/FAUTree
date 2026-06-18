from __future__ import annotations

import unittest

from backend.fautree.core.fmeda import compute_fmeda_summary
from backend.fautree.core.model import FaultTreeProject


class FmedaSummaryTests(unittest.TestCase):
    def test_compute_fmeda_summary_aggregates_exida_lambda_buckets(self) -> None:
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
                        "failureRateFit": 10.0,
                        "dangerous": True,
                        "diagnosticCoveragePercent": 70.0,
                        "faultClassification": "SPF",
                    },
                    {
                        "id": "row-2",
                        "failureRateFit": 8.0,
                        "dangerous": False,
                        "diagnosticCoveragePercent": 62.5,
                        "faultClassification": "RF",
                    },
                    {
                        "id": "row-3",
                        "failureRateFit": 4.0,
                        "dangerous": True,
                        "diagnosticCoveragePercent": 25.0,
                        "faultClassification": "MPF",
                        "latent": True,
                    },
                ],
            }
        )

        summary = compute_fmeda_summary(project)

        self.assertEqual(summary.lambda_sd, 5.0)
        self.assertEqual(summary.lambda_su, 3.0)
        self.assertEqual(summary.lambda_dd, 8.0)
        self.assertEqual(summary.lambda_du, 6.0)
        self.assertEqual(summary.lambda_safe, 8.0)
        self.assertEqual(summary.lambda_dangerous, 14.0)
        self.assertEqual(summary.lambda_total, 22.0)
        self.assertAlmostEqual(summary.dangerous_diagnostic_coverage, 8.0 / 14.0)
        self.assertEqual(summary.lambda_spf, 10.0)
        self.assertEqual(summary.lambda_rf, 0.0)
        self.assertEqual(summary.lambda_mpf, 4.0)
        self.assertEqual(summary.lambda_latent_mpf, 4.0)
        self.assertAlmostEqual(summary.spfm, 1.0 - (10.0 / 22.0))
        self.assertAlmostEqual(summary.lfm, 0.0)
        self.assertEqual(summary.pmhf, 6.0)
        self.assertAlmostEqual(summary.sff, 16.0 / 22.0)
        self.assertEqual(summary.to_dict()["rowCount"], 3)

    def test_compute_fmeda_summary_keeps_annunciation_and_no_effect_separate(self) -> None:
        project = FaultTreeProject.from_dict(
            {
                "schemaVersion": "0.1.0",
                "project": {"id": "demo", "name": "Demo"},
                "analysis": {},
                "nodes": [],
                "edges": [],
                "fmea": [
                    {"id": "row-1", "failureRateFit": 2.0, "failureCategory": "annunciation"},
                    {"id": "row-2", "failureRateFit": 3.0, "failureCategory": "no_effect"},
                ],
            }
        )

        summary = compute_fmeda_summary(project)

        self.assertEqual(summary.lambda_annunciation, 2.0)
        self.assertEqual(summary.lambda_no_effect, 3.0)
        self.assertEqual(summary.lambda_safe, 0.0)
        self.assertEqual(summary.lambda_dangerous, 0.0)
        self.assertEqual(summary.lambda_total, 5.0)
        self.assertIsNone(summary.lfm)


if __name__ == "__main__":
    unittest.main()
