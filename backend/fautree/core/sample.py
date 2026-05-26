from __future__ import annotations

from .model import (
    AnalysisSettings,
    FaultTreeEdge,
    FaultTreeNode,
    FaultTreeProject,
    ProjectMetadata,
)


def build_sample_project() -> FaultTreeProject:
    return FaultTreeProject(
        schema_version="0.1.0",
        project=ProjectMetadata(
            id="demo-train-control",
            name="Train Control Communication Failure",
            description="Starter example for the Phase 1 FAUTree shell.",
        ),
        analysis=AnalysisSettings(
            mission_time=1000.0,
            time_unit="hour",
            variable_ordering="topological",
        ),
        nodes=[
            FaultTreeNode("top", "top_event", "Train control unavailable"),
            FaultTreeNode("g1", "gate", "Communication failure", gate_type="OR"),
            FaultTreeNode("e1", "basic_event", "Controller failure", failure_rate=0.000003),
            FaultTreeNode("g2", "gate", "Redundant link loss", gate_type="AND"),
            FaultTreeNode("e2", "basic_event", "Primary link disconnected", failure_rate=0.000003),
            FaultTreeNode("e3", "basic_event", "Backup link disconnected", failure_rate=0.000003),
            FaultTreeNode("e4", "basic_event", "Switch failure", failure_rate=0.000003),
        ],
        edges=[
            FaultTreeEdge("top", "g1"),
            FaultTreeEdge("g1", "e1"),
            FaultTreeEdge("g1", "g2"),
            FaultTreeEdge("g1", "e4"),
            FaultTreeEdge("g2", "e2"),
            FaultTreeEdge("g2", "e3"),
        ],
    )

