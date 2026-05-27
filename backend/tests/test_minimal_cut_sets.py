from __future__ import annotations

import unittest

from backend.fautree.core.minimal_cut_sets import compute_minimal_cut_sets
from backend.fautree.core.model import (
    AnalysisSettings,
    FaultTreeEdge,
    FaultTreeNode,
    FaultTreeProject,
    ProjectMetadata,
)
from backend.fautree.core.sample import build_sample_project


class MinimalCutSetTests(unittest.TestCase):
    def test_sample_project_cut_sets(self) -> None:
        cut_sets = compute_minimal_cut_sets(build_sample_project())

        self.assertEqual(
            [set(cut_set.event_labels) for cut_set in cut_sets],
            [
                {"Power supply failure"},
                {"Control unit failure"},
                {"Primary protection failure", "Backup protection failure"},
            ],
        )

    def test_removes_non_minimal_supersets(self) -> None:
        project = FaultTreeProject(
            schema_version="0.1.0",
            project=ProjectMetadata(id="test", name="Test"),
            analysis=AnalysisSettings(),
            nodes=[
                FaultTreeNode("top", "top_event", "Top"),
                FaultTreeNode("g1", "gate", "Top logic", gate_type="OR"),
                FaultTreeNode("a", "basic_event", "A"),
                FaultTreeNode("g2", "gate", "Redundant branch", gate_type="AND"),
                FaultTreeNode("b", "basic_event", "B"),
            ],
            edges=[
                FaultTreeEdge("top", "g1"),
                FaultTreeEdge("g1", "a"),
                FaultTreeEdge("g1", "g2"),
                FaultTreeEdge("g2", "a"),
                FaultTreeEdge("g2", "b"),
            ],
        )

        cut_sets = compute_minimal_cut_sets(project)

        self.assertEqual([cut_set.event_labels for cut_set in cut_sets], [("A",)])


if __name__ == "__main__":
    unittest.main()
