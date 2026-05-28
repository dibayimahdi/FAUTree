from __future__ import annotations

import unittest

from backend.fautree.core.bdd import compute_bdd_analysis
from backend.fautree.core.model import (
    AnalysisSettings,
    FaultTreeEdge,
    FaultTreeNode,
    FaultTreeProject,
    ProjectMetadata,
)
from backend.fautree.core.sample import build_sample_project


class BDDAnalysisTests(unittest.TestCase):
    def test_sample_project_exact_probability(self) -> None:
        result = compute_bdd_analysis(build_sample_project(), "infix")

        self.assertEqual(result.variable_order, ("Power supply failure", "Primary protection failure", "Backup protection failure", "Control unit failure"))
        self.assertAlmostEqual(result.exact_probability, 0.00000499999999999775)
        self.assertGreater(result.node_count, 0)

    def test_ordering_affects_node_count_for_paper_example(self) -> None:
        project = FaultTreeProject(
            schema_version="0.1.0",
            project=ProjectMetadata(id="paper", name="Paper ordering example"),
            analysis=AnalysisSettings(),
            nodes=[
                FaultTreeNode("top", "top_event", "Top"),
                FaultTreeNode("g0", "gate", "Top logic", gate_type="OR"),
                FaultTreeNode("g1", "gate", "x1 and x2", gate_type="AND"),
                FaultTreeNode("g2", "gate", "x4 and x5 and x6", gate_type="AND"),
                FaultTreeNode("x6", "basic_event", "x6"),
                FaultTreeNode("x4", "basic_event", "x4"),
                FaultTreeNode("x2", "basic_event", "x2"),
                FaultTreeNode("x5", "basic_event", "x5"),
                FaultTreeNode("x3", "basic_event", "x3"),
                FaultTreeNode("x1", "basic_event", "x1"),
            ],
            edges=[
                FaultTreeEdge("top", "g0"),
                FaultTreeEdge("g0", "g1"),
                FaultTreeEdge("g0", "x3"),
                FaultTreeEdge("g0", "g2"),
                FaultTreeEdge("g1", "x1"),
                FaultTreeEdge("g1", "x2"),
                FaultTreeEdge("g2", "x4"),
                FaultTreeEdge("g2", "x5"),
                FaultTreeEdge("g2", "x6"),
            ],
        )

        good = compute_bdd_analysis(project, "infix")
        bad = compute_bdd_analysis(project, "topological")

        self.assertEqual(good.variable_order, ("x1", "x2", "x3", "x4", "x5", "x6"))
        self.assertEqual(bad.variable_order, ("x6", "x4", "x2", "x5", "x3", "x1"))
        self.assertLess(good.node_count, bad.node_count)

    def test_repeated_basic_event_uses_first_infix_position(self) -> None:
        project = FaultTreeProject(
            schema_version="0.1.0",
            project=ProjectMetadata(id="repeated", name="Repeated event"),
            analysis=AnalysisSettings(),
            nodes=[
                FaultTreeNode("top", "top_event", "Top"),
                FaultTreeNode("g1", "gate", "Top logic", gate_type="OR"),
                FaultTreeNode("g2", "gate", "First branch", gate_type="AND"),
                FaultTreeNode("g3", "gate", "Second branch", gate_type="AND"),
                FaultTreeNode("a1", "basic_event", "A", probability=0.1),
                FaultTreeNode("b", "basic_event", "B", probability=0.1),
                FaultTreeNode("a2", "basic_event", "A", probability=0.1),
                FaultTreeNode("c", "basic_event", "C", probability=0.1),
            ],
            edges=[
                FaultTreeEdge("top", "g1"),
                FaultTreeEdge("g1", "g2"),
                FaultTreeEdge("g1", "g3"),
                FaultTreeEdge("g2", "a1"),
                FaultTreeEdge("g2", "b"),
                FaultTreeEdge("g3", "a2"),
                FaultTreeEdge("g3", "c"),
            ],
        )

        result = compute_bdd_analysis(project, "infix")

        self.assertEqual(result.variable_order, ("A", "B", "C"))

    def test_undeveloped_event_is_bdd_variable(self) -> None:
        project = FaultTreeProject(
            schema_version="0.1.0",
            project=ProjectMetadata(id="undeveloped", name="Undeveloped event"),
            analysis=AnalysisSettings(),
            nodes=[
                FaultTreeNode("top", "top_event", "Top"),
                FaultTreeNode("g1", "gate", "Top logic", gate_type="OR"),
                FaultTreeNode("a", "basic_event", "A", probability=0.1),
                FaultTreeNode("u", "undeveloped_event", "Unspecified cause", probability=0.2),
            ],
            edges=[
                FaultTreeEdge("top", "g1"),
                FaultTreeEdge("g1", "a"),
                FaultTreeEdge("g1", "u"),
            ],
        )

        result = compute_bdd_analysis(project, "infix")

        self.assertEqual(result.variable_order, ("A", "Unspecified cause"))
        self.assertAlmostEqual(result.exact_probability, 0.28)


if __name__ == "__main__":
    unittest.main()
