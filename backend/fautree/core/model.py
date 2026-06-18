from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Literal


NodeType = Literal["top_event", "intermediate_event", "basic_event", "undeveloped_event", "gate"]
GateType = Literal["AND", "OR", "K_OF_N"]
GATE_TYPES = {"AND", "OR", "K_OF_N"}
FAULT_CLASSIFICATIONS = {"SPF", "RF", "MPF"}
IEC_61508_FAILURE_CATEGORIES = {"safe", "dangerous", "annunciation", "no_effect"}


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
    component: str = ""
    item_function: str = ""
    failure_mode: str = ""
    failure_mechanism: str = ""
    effect: str = ""
    cause: str = ""
    safety_mechanism: str = ""
    fault_tree_event_id: str = ""
    failure_rate_fit: float = 0.0
    failure_category: str = "dangerous"
    dangerous: bool = True
    diagnostic_coverage_percent: float = 0.0
    fault_classification: str = "SPF"
    latent: bool = False
    severity: int = 1
    occurrence: int = 1
    detectability: int = 1

    @property
    def diagnostic_coverage_fraction(self) -> float:
        return max(0.0, min(self.diagnostic_coverage_percent, 100.0)) / 100.0

    @property
    def lambda_sd(self) -> float:
        if self.failure_category != "safe":
            return 0.0
        return self.failure_rate_fit * self.diagnostic_coverage_fraction

    @property
    def lambda_su(self) -> float:
        if self.failure_category != "safe":
            return 0.0
        return self.failure_rate_fit * (1.0 - self.diagnostic_coverage_fraction)

    @property
    def lambda_dd(self) -> float:
        if self.failure_category != "dangerous":
            return 0.0
        return self.failure_rate_fit * self.diagnostic_coverage_fraction

    @property
    def lambda_du(self) -> float:
        if self.failure_category != "dangerous":
            return 0.0
        return self.failure_rate_fit * (1.0 - self.diagnostic_coverage_fraction)

    @property
    def lambda_annunciation(self) -> float:
        if self.failure_category != "annunciation":
            return 0.0
        return self.failure_rate_fit

    @property
    def lambda_no_effect(self) -> float:
        if self.failure_category != "no_effect":
            return 0.0
        return self.failure_rate_fit

    @property
    def lambda_spf(self) -> float:
        if self.failure_category != "dangerous" or self.fault_classification != "SPF":
            return 0.0
        return self.failure_rate_fit

    @property
    def lambda_rf(self) -> float:
        if self.failure_category != "dangerous" or self.fault_classification != "RF":
            return 0.0
        return self.failure_rate_fit

    @property
    def lambda_mpf(self) -> float:
        if self.failure_category != "dangerous" or self.fault_classification != "MPF":
            return 0.0
        return self.failure_rate_fit

    @property
    def lambda_latent_mpf(self) -> float:
        if not self.latent:
            return 0.0
        return self.lambda_mpf

    @property
    def lambda_safe(self) -> float:
        return self.lambda_sd + self.lambda_su

    @property
    def lambda_dangerous(self) -> float:
        return self.lambda_dd + self.lambda_du

    @property
    def lambda_total(self) -> float:
        return self.failure_rate_fit

    @property
    def diagnostic_coverage(self) -> float:
        dangerous = self.lambda_dangerous
        if dangerous <= 0:
            return 0.0
        return self.lambda_dd / dangerous

    def to_dict(self) -> dict[str, str | int | float]:
        return {
            "id": self.id,
            "component": self.component,
            "itemFunction": self.item_function,
            "failureMode": self.failure_mode,
            "failureMechanism": self.failure_mechanism,
            "effect": self.effect,
            "cause": self.cause,
            "safetyMechanism": self.safety_mechanism,
            "faultTreeEventId": self.fault_tree_event_id,
            "failureRateFit": self.failure_rate_fit,
            "failureCategory": self.failure_category,
            "dangerous": self.failure_category == "dangerous",
            "diagnosticCoveragePercent": self.diagnostic_coverage_percent,
            "faultClassification": self.fault_classification,
            "latent": self.latent,
            "lambdaSD": self.lambda_sd,
            "lambdaSU": self.lambda_su,
            "lambdaDD": self.lambda_dd,
            "lambdaDU": self.lambda_du,
            "lambdaAnnunciation": self.lambda_annunciation,
            "lambdaNoEffect": self.lambda_no_effect,
            "lambdaSPF": self.lambda_spf,
            "lambdaRF": self.lambda_rf,
            "lambdaMPF": self.lambda_mpf,
            "lambdaLatentMPF": self.lambda_latent_mpf,
            "lambdaSafe": self.lambda_safe,
            "lambdaDangerous": self.lambda_dangerous,
            "lambdaTotal": self.lambda_total,
            "diagnosticCoverage": self.diagnostic_coverage,
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
        fmeda_payload = payload.get("fmeda", payload.get("fmea", []))
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
                for index, row in enumerate(fmeda_payload, start=1)
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
            if not math.isfinite(row.failure_rate_fit) or row.failure_rate_fit < 0:
                errors.append(f"FMEDA row {row.id} has invalid failureRateFit.")
            if not math.isfinite(row.diagnostic_coverage_percent) or row.diagnostic_coverage_percent < 0 or row.diagnostic_coverage_percent > 100:
                errors.append(f"FMEDA row {row.id} has diagnosticCoveragePercent outside the 0-100 range.")
            if row.fault_classification not in FAULT_CLASSIFICATIONS:
                errors.append(f"FMEDA row {row.id} has unsupported faultClassification: {row.fault_classification}.")
            if row.failure_category not in IEC_61508_FAILURE_CATEGORIES:
                errors.append(f"FMEDA row {row.id} has unsupported failureCategory: {row.failure_category}.")

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
        failure_category = FaultTreeProject._failure_category_from_row(row)
        return FmeaRow(
            id=row.get("id", f"fmea-row-{index}"),
            component=row.get("component", row.get("block", row.get("part", ""))),
            item_function=row.get("itemFunction", row.get("item", "")),
            failure_mode=row.get("failureMode", ""),
            failure_mechanism=row.get("failureMechanism", row.get("mechanism", "")),
            effect=row.get("effect", ""),
            cause=row.get("cause", ""),
            safety_mechanism=row.get("safetyMechanism", row.get("diagnostic", "")),
            fault_tree_event_id=row.get("faultTreeEventId", row.get("basicEventId", row.get("eventId", ""))),
            failure_rate_fit=FaultTreeProject._failure_rate_fit_from_row(row),
            failure_category=failure_category,
            dangerous=failure_category == "dangerous",
            diagnostic_coverage_percent=FaultTreeProject._diagnostic_coverage_percent_from_row(row),
            fault_classification=FaultTreeProject._fault_classification_from_row(row),
            latent=FaultTreeProject._bool_from_row(row, "latent", fallback=False),
            severity=int(row.get("severity", 1) or 1),
            occurrence=int(row.get("occurrence", 1) or 1),
            detectability=int(row.get("detectability", row.get("detection", 1)) or 1),
        )

    @staticmethod
    def _float_from_row(row: dict, *keys: str) -> float:
        for key in keys:
            if key in row and row[key] not in ("", None):
                return float(row[key])
        return 0.0

    @staticmethod
    def _failure_rate_fit_from_row(row: dict) -> float:
        for key in ("failureRateFit", "fit", "totalFit", "failureRate", "lambdaTotal"):
            if key in row and row[key] not in ("", None):
                return float(row[key])
        return sum(
            FaultTreeProject._float_from_row(row, *keys)
            for keys in (
                ("lambdaSD", "lambdaSd", "lambda_sd"),
                ("lambdaSU", "lambdaSu", "lambda_su"),
                ("lambdaDD", "lambdaDd", "lambda_dd"),
                ("lambdaDU", "lambdaDu", "lambda_du"),
            )
        )

    @staticmethod
    def _diagnostic_coverage_percent_from_row(row: dict) -> float:
        for key in ("diagnosticCoveragePercent", "dcPercent", "dc"):
            if key in row and row[key] not in ("", None):
                return float(row[key])
        if "diagnosticCoverage" in row and row["diagnosticCoverage"] not in ("", None):
            coverage = float(row["diagnosticCoverage"])
            return coverage * 100.0 if coverage <= 1.0 else coverage

        dangerous = FaultTreeProject._dangerous_from_lambda_buckets(row)
        if dangerous:
            detected = FaultTreeProject._float_from_row(row, "lambdaDD", "lambdaDd", "lambda_dd")
            undetected = FaultTreeProject._float_from_row(row, "lambdaDU", "lambdaDu", "lambda_du")
        else:
            detected = FaultTreeProject._float_from_row(row, "lambdaSD", "lambdaSd", "lambda_sd")
            undetected = FaultTreeProject._float_from_row(row, "lambdaSU", "lambdaSu", "lambda_su")
        total = detected + undetected
        return (detected / total) * 100.0 if total > 0 else 0.0

    @staticmethod
    def _dangerous_from_lambda_buckets(row: dict) -> bool:
        dangerous_total = (
            FaultTreeProject._float_from_row(row, "lambdaDD", "lambdaDd", "lambda_dd")
            + FaultTreeProject._float_from_row(row, "lambdaDU", "lambdaDu", "lambda_du")
        )
        safe_total = (
            FaultTreeProject._float_from_row(row, "lambdaSD", "lambdaSd", "lambda_sd")
            + FaultTreeProject._float_from_row(row, "lambdaSU", "lambdaSu", "lambda_su")
        )
        return dangerous_total >= safe_total

    @staticmethod
    def _fault_classification_from_row(row: dict) -> str:
        value = str(row.get("faultClassification", row.get("faultType", "SPF")) or "SPF").upper()
        return value if value in FAULT_CLASSIFICATIONS else "SPF"

    @staticmethod
    def _failure_category_from_row(row: dict) -> str:
        raw_value = row.get(
            "failureCategory",
            row.get("failureModeCategory", row.get("iec61508FailureCategory")),
        )
        if raw_value not in ("", None):
            normalized = str(raw_value).strip().lower().replace("-", "_").replace(" ", "_")
            category_aliases = {
                "safe": "safe",
                "s": "safe",
                "dangerous": "dangerous",
                "d": "dangerous",
                "annunciation": "annunciation",
                "annunciated": "annunciation",
                "a": "annunciation",
                "no_effect": "no_effect",
                "noeffect": "no_effect",
                "ne": "no_effect",
            }
            if normalized in category_aliases:
                return category_aliases[normalized]

        if "dangerous" in row:
            return "dangerous" if FaultTreeProject._bool_from_row(row, "dangerous", fallback=True) else "safe"
        return "dangerous" if FaultTreeProject._dangerous_from_lambda_buckets(row) else "safe"

    @staticmethod
    def _bool_from_row(row: dict, key: str, fallback: bool) -> bool:
        if key not in row:
            return fallback
        value = row[key]
        if isinstance(value, bool):
            return value
        normalized = str(value).strip().lower()
        if normalized in {"1", "true", "yes", "y"}:
            return True
        if normalized in {"0", "false", "no", "n"}:
            return False
        return fallback
