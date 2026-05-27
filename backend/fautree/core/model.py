from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


NodeType = Literal["top_event", "intermediate_event", "basic_event", "gate"]
GateType = Literal["AND", "OR", "K_OF_N"]


@dataclass(frozen=True)
class FaultTreeNode:
    id: str
    type: NodeType
    label: str
    gate_type: GateType | None = None
    failure_rate: float | None = None
    probability: float | None = None

    def to_dict(self) -> dict:
        payload: dict[str, str | float | None] = {
            "id": self.id,
            "type": self.type,
            "label": self.label,
        }
        if self.gate_type is not None:
            payload["gateType"] = self.gate_type
        if self.failure_rate is not None:
            payload["failureRate"] = self.failure_rate
        if self.probability is not None:
            payload["probability"] = self.probability
        return payload


@dataclass(frozen=True)
class FaultTreeEdge:
    source: str
    target: str

    def to_dict(self) -> dict[str, str]:
        return {
            "source": self.source,
            "target": self.target,
        }


@dataclass(frozen=True)
class AnalysisSettings:
    mission_time: float = 1000.0
    time_unit: str = "hour"
    variable_ordering: str = "topological"

    def to_dict(self) -> dict[str, str | float]:
        return {
            "missionTime": self.mission_time,
            "timeUnit": self.time_unit,
            "variableOrdering": self.variable_ordering,
        }


@dataclass(frozen=True)
class ProjectMetadata:
    id: str
    name: str
    description: str = ""
    created_by: str = "FAUTree"

    def to_dict(self) -> dict[str, str]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "createdBy": self.created_by,
        }


@dataclass(frozen=True)
class FaultTreeProject:
    schema_version: str
    project: ProjectMetadata
    analysis: AnalysisSettings
    nodes: list[FaultTreeNode] = field(default_factory=list)
    edges: list[FaultTreeEdge] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "schemaVersion": self.schema_version,
            "project": self.project.to_dict(),
            "analysis": self.analysis.to_dict(),
            "nodes": [node.to_dict() for node in self.nodes],
            "edges": [edge.to_dict() for edge in self.edges],
        }

    @classmethod
    def from_dict(cls, payload: dict) -> "FaultTreeProject":
        project_payload = payload.get("project", {})
        analysis_payload = payload.get("analysis", {})
        return cls(
            schema_version=payload.get("schemaVersion", "0.1.0"),
            project=ProjectMetadata(
                id=project_payload.get("id", "untitled"),
                name=project_payload.get("name", "Untitled Fault Tree"),
                description=project_payload.get("description", ""),
                created_by=project_payload.get("createdBy", "FAUTree"),
            ),
            analysis=AnalysisSettings(
                mission_time=float(analysis_payload.get("missionTime", 1000.0)),
                time_unit=analysis_payload.get("timeUnit", "hour"),
                variable_ordering=analysis_payload.get("variableOrdering", "topological"),
            ),
            nodes=[
                FaultTreeNode(
                    id=node["id"],
                    type=node["type"],
                    label=node["label"],
                    gate_type=node.get("gateType"),
                    failure_rate=node.get("failureRate"),
                    probability=node.get("probability"),
                )
                for node in payload.get("nodes", [])
            ],
            edges=[
                FaultTreeEdge(source=edge["source"], target=edge["target"])
                for edge in payload.get("edges", [])
            ],
        )

    def validate(self) -> list[str]:
        errors: list[str] = []
        node_ids = {node.id for node in self.nodes}

        if len(node_ids) != len(self.nodes):
            errors.append("Node ids must be unique.")

        top_events = [node for node in self.nodes if node.type == "top_event"]
        if len(top_events) != 1:
            errors.append("A fault tree must contain exactly one top event.")

        for edge in self.edges:
            if edge.source not in node_ids:
                errors.append(f"Edge source does not exist: {edge.source}")
            if edge.target not in node_ids:
                errors.append(f"Edge target does not exist: {edge.target}")

        for node in self.nodes:
            if node.type == "gate" and node.gate_type is None:
                errors.append(f"Gate node is missing gate_type: {node.id}")
            if node.type != "gate" and node.gate_type is not None:
                errors.append(f"Only gate nodes can define gate_type: {node.id}")

        return errors
