from __future__ import annotations

from .model import (
    AnalysisSettings,
    FmeaRow,
    FaultTreeEdge,
    FaultTreeNode,
    FaultTreeProject,
    ProjectMetadata,
)


def build_sample_project() -> FaultTreeProject:
    return FaultTreeProject(
        schema_version="0.1.0",
        project=ProjectMetadata(
            id="generic-fault-tree",
            name="Generic Fault Tree Project",
            description="Starter example for the FAUTree shell.",
        ),
        analysis=AnalysisSettings(
            quantification="rare-event-approximation",
            variable_ordering="infix",
        ),
        nodes=[
            FaultTreeNode("top", "top_event", "System failure"),
            FaultTreeNode("g1", "gate", "Top event logic", gate_type="OR"),
            FaultTreeNode("e1", "basic_event", "Power supply failure", failure_rate=0.000002),
            FaultTreeNode("g2", "gate", "Protection subsystem failure", gate_type="AND"),
            FaultTreeNode("e2", "basic_event", "Primary protection failure", failure_rate=0.0000015),
            FaultTreeNode("e3", "basic_event", "Backup protection failure", failure_rate=0.0000015),
            FaultTreeNode("e4", "basic_event", "Control unit failure", failure_rate=0.000003),
        ],
        edges=[
            FaultTreeEdge("top", "g1"),
            FaultTreeEdge("g1", "e1"),
            FaultTreeEdge("g1", "g2"),
            FaultTreeEdge("g1", "e4"),
            FaultTreeEdge("g2", "e2"),
            FaultTreeEdge("g2", "e3"),
        ],
        fmea=[
            FmeaRow(
                id="fmeda-row-1",
                component="Power management IC",
                item_function="Generate regulated supply",
                failure_mode="Output stuck low",
                failure_mechanism="Internal regulator open",
                effect="Loss of system power",
                safety_mechanism="Voltage monitor diagnostic",
                fault_tree_event_id="e1",
                failure_rate_fit=1.5,
                dangerous=True,
                diagnostic_coverage_percent=80.0,
                fault_classification="SPF",
                latent=False,
            )
        ],
    )
