from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


NodeType = Literal["top_event", "intermediate_event", "basic_event", "undeveloped_event", "gate"]
GateType = Literal["AND", "OR", "K_OF_N"]
GATE_TYPES = {"AND", "OR", "K_OF_N"}


@dataclass(frozen=True)
class FaultTreeNode:
    id: str
    type: NodeType
    label: str
    gate_type: GateType | None = None
    voting_threshold: int | None = None
    failure_rate: float | None = None
    probability: float | None = None

    def to_dict(self) -> dict:
        payload: dict[str, str | int | float | None] = {
            "id": self.id,
            "type": self.type,
            "label": self.label,
        }
        if self.gate_type is not None:
            payload["gateType"] = self.gate_type
        if self.voting_threshold is not None:
            payload["votingThreshold"] = self.voting_threshold
        if self.probability is not None:
            payload["probability"] = self.probability
        elif self.failure_rate is not None:
            payload["probability"] = self.failure_rate
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
class FmeaRow:
    id: str
    item_function: str = ""
    failure_mode: str = ""
    effect: str = ""
    cause: str = ""
    severity: int = 1
    occurrence: int = 1
    detectability: int = 1

    def to_dict(self) -> dict[str, str | int]:
        return {
            "id": self.id,
            "itemFunction": self.item_function,
            "failureMode": self.failure_mode,
            "effect": self.effect,
            "cause": self.cause,
            "severity": self.severity,
            "occurrence": self.occurrence,
            "detectability": self.detectability,
            "rpn": self.severity * self.occurrence * self.detectability,
        }


@dataclass(frozen=True)
class AnalysisSettings:
    quantification: str = "rare-event-approximation"
    variable_ordering: str = "infix"
    custom_variable_order: tuple[str, ...] = ()
    mission_time_hours: float = 8760.0
    time_unit: str = "hours"
    reliability_x_min_hours: float = 0.0
    reliability_x_max_hours: float = 8760.0
    reliability_y_min: float = 0.0
    reliability_y_max: float = 1.05

    def to_dict(self) -> dict:
        payload = {
            "quantification": self.quantification,
            "variableOrdering": self.variable_ordering,
            "missionTimeHours": self.mission_time_hours,
            "timeUnit": self.time_unit,
            "reliabilityXAxisMinHours": self.reliability_x_min_hours,
            "reliabilityXAxisMaxHours": self.reliability_x_max_hours,
            "reliabilityYAxisMin": self.reliability_y_min,
            "reliabilityYAxisMax": self.reliability_y_max,
        }
        if self.custom_variable_order:
            payload["customVariableOrder"] = list(self.custom_variable_order)
        return payload


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
    fmea: list[FmeaRow] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "schemaVersion": self.schema_version,
            "project": self.project.to_dict(),
            "analysis": self.analysis.to_dict(),
            "nodes": [node.to_dict() for node in self.nodes],
            "edges": [edge.to_dict() for edge in self.edges],
            "fmea": [row.to_dict() for row in self.fmea],
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
                quantification=analysis_payload.get("quantification", "rare-event-approximation"),
                variable_ordering="infix" if analysis_payload.get("variableOrdering", "infix") == "topological" else analysis_payload.get("variableOrdering", "infix"),
                custom_variable_order=tuple(analysis_payload.get("customVariableOrder", [])),
                mission_time_hours=float(analysis_payload.get("missionTimeHours", analysis_payload.get("missionTime", 8760.0))),
                time_unit=analysis_payload.get("timeUnit", "hours"),
                reliability_x_min_hours=float(analysis_payload.get("reliabilityXAxisMinHours", 0.0)),
                reliability_x_max_hours=float(
                    analysis_payload.get(
                        "reliabilityXAxisMaxHours",
                        analysis_payload.get("missionTimeHours", analysis_payload.get("missionTime", 8760.0)),
                    )
                ),
                reliability_y_min=float(analysis_payload.get("reliabilityYAxisMin", 0.0)),
                reliability_y_max=float(analysis_payload.get("reliabilityYAxisMax", 1.05)),
            ),
            nodes=[
                cls._node_from_dict(node)
                for node in payload.get("nodes", [])
            ],
            edges=[
                FaultTreeEdge(source=edge["source"], target=edge["target"])
                for edge in payload.get("edges", [])
            ],
            fmea=[
                cls._fmea_from_dict(row, index)
                for index, row in enumerate(payload.get("fmea", []), start=1)
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
            if node.type == "gate" and node.gate_type is not None and node.gate_type not in GATE_TYPES:
                errors.append(f"Unsupported gate_type for gate node {node.id}: {node.gate_type}")
            if node.type == "gate" and node.gate_type == "K_OF_N":
                if node.voting_threshold is None:
                    errors.append(f"Voting gate is missing voting_threshold: {node.id}")
                elif node.voting_threshold < 1:
                    errors.append(f"Voting gate threshold must be at least 1: {node.id}")
            if node.type != "gate" and node.gate_type is not None:
                errors.append(f"Only gate nodes can define gate_type: {node.id}")
            if (node.type != "gate" or node.gate_type != "K_OF_N") and node.voting_threshold is not None:
                errors.append(f"Only voting gate nodes can define voting_threshold: {node.id}")

        rates_by_basic_event_label: dict[str, set[float]] = {}
        for node in self.nodes:
            if node.type not in {"basic_event", "undeveloped_event"}:
                continue
            rate = float(node.probability if node.probability is not None else node.failure_rate or 0)
            rates_by_basic_event_label.setdefault(node.label, set()).add(rate)

        for label, rates in rates_by_basic_event_label.items():
            if len(rates) > 1:
                errors.append(
                    f'Repeated basic event "{label}" has inconsistent probabilities.'
                )

        for row in self.fmea:
            if row.severity < 1 or row.severity > 10:
                errors.append(f"FMEA row {row.id} has severity outside the 1-10 range.")
            if row.occurrence < 1 or row.occurrence > 10:
                errors.append(f"FMEA row {row.id} has occurrence outside the 1-10 range.")
            if row.detectability < 1 or row.detectability > 10:
                errors.append(f"FMEA row {row.id} has detectability outside the 1-10 range.")

        if self.analysis.mission_time_hours <= 0:
            errors.append("Mission time must be greater than zero.")
        if self.analysis.reliability_x_min_hours < 0:
            errors.append("Reliability chart t-axis minimum must be zero or greater.")
        if self.analysis.reliability_x_max_hours <= self.analysis.reliability_x_min_hours:
            errors.append("Reliability chart t-axis maximum must be greater than its minimum.")
        if self.analysis.reliability_y_max <= self.analysis.reliability_y_min:
            errors.append("Reliability chart y-axis maximum must be greater than its minimum.")

        return errors

    @staticmethod
    def _node_from_dict(node: dict) -> FaultTreeNode:
        gate_type = node.get("gateType")
        if gate_type == "VOTING":
            gate_type = "K_OF_N"
        voting_threshold = node.get("votingThreshold", node.get("threshold"))
        return FaultTreeNode(
            id=node["id"],
            type=node["type"],
            label=node["label"],
            gate_type=gate_type,
            voting_threshold=int(voting_threshold) if voting_threshold is not None else None,
            failure_rate=node.get("failureRate"),
            probability=node.get("probability", node.get("failureRate")),
        )

    @staticmethod
    def _fmea_from_dict(row: dict, index: int) -> FmeaRow:
        return FmeaRow(
            id=row.get("id", f"fmea-row-{index}"),
            item_function=row.get("itemFunction", row.get("item", "")),
            failure_mode=row.get("failureMode", ""),
            effect=row.get("effect", ""),
            cause=row.get("cause", ""),
            severity=int(row.get("severity", 1) or 1),
            occurrence=int(row.get("occurrence", 1) or 1),
            detectability=int(row.get("detectability", row.get("detection", 1)) or 1),
        )
