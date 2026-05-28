from __future__ import annotations

from dataclasses import dataclass

from .model import FaultTreeNode, FaultTreeProject


@dataclass(frozen=True)
class MinimalCutSet:
    event_ids: tuple[str, ...]
    event_labels: tuple[str, ...]

    @property
    def order(self) -> int:
        return len(self.event_ids)

    def to_dict(self) -> dict:
        return {
            "eventIds": list(self.event_ids),
            "events": list(self.event_labels),
            "order": self.order,
        }


def compute_minimal_cut_sets(project: FaultTreeProject) -> list[MinimalCutSet]:
    analyzer = _MocusAnalyzer(project)
    return analyzer.compute()


class _MocusAnalyzer:
    def __init__(self, project: FaultTreeProject) -> None:
        self.project = project
        self.nodes = {node.id: node for node in project.nodes}
        self.children: dict[str, list[str]] = {node.id: [] for node in project.nodes}
        self.basic_event_id_by_label: dict[str, str] = {}
        for edge in project.edges:
            self.children.setdefault(edge.source, []).append(edge.target)
        for node in project.nodes:
            if node.type in {"basic_event", "undeveloped_event"}:
                self.basic_event_id_by_label.setdefault(node.label, node.id)

    def compute(self) -> list[MinimalCutSet]:
        validation_errors = self.project.validate()
        if validation_errors:
            raise ValueError("; ".join(validation_errors))

        top_events = [node for node in self.project.nodes if node.type == "top_event"]
        if len(top_events) != 1:
            raise ValueError("A fault tree must contain exactly one top event.")

        raw_cut_sets = self._expand(top_events[0].id, path=[])
        minimal_sets = self._minimize(raw_cut_sets)
        return [
            MinimalCutSet(
                event_ids=tuple(sorted(cut_set)),
                event_labels=tuple(self.nodes[event_id].label for event_id in sorted(cut_set)),
            )
            for cut_set in minimal_sets
        ]

    def _expand(self, node_id: str, path: list[str]) -> list[frozenset[str]]:
        if node_id in path:
            cycle = " -> ".join([*path, node_id])
            raise ValueError(f"Cycle detected in fault tree: {cycle}")

        node = self._node(node_id)
        child_ids = self.children.get(node_id, [])

        if node.type in {"basic_event", "undeveloped_event"}:
            return [frozenset([self.basic_event_id_by_label[node.label]])]

        if node.type in {"top_event", "intermediate_event"}:
            if len(child_ids) != 1:
                raise ValueError(f"{node.label} must connect to exactly one logic gate.")
            child = self._node(child_ids[0])
            if child.type != "gate":
                raise ValueError(f"{node.label} must connect to an AND or OR gate.")
            return self._expand(child.id, [*path, node_id])

        if node.type != "gate":
            raise ValueError(f"Unsupported node type: {node.type}")

        if len(child_ids) < 2:
            raise ValueError(f"{node.label} must have at least two input events.")

        child_sets = [self._expand(child_id, [*path, node_id]) for child_id in child_ids]

        if node.gate_type == "OR":
            return self._minimize([cut_set for sets in child_sets for cut_set in sets])

        if node.gate_type == "AND":
            combinations = [frozenset()]
            for sets in child_sets:
                combinations = [
                    left.union(right)
                    for left in combinations
                    for right in sets
                ]
            return self._minimize(combinations)

        raise ValueError(f"Unsupported gate type for minimal cut sets: {node.gate_type}")

    def _node(self, node_id: str) -> FaultTreeNode:
        node = self.nodes.get(node_id)
        if node is None:
            raise ValueError(f"Node does not exist: {node_id}")
        return node

    @staticmethod
    def _minimize(cut_sets: list[frozenset[str]]) -> list[frozenset[str]]:
        unique_sets = sorted(set(cut_sets), key=lambda item: (len(item), sorted(item)))
        minimal: list[frozenset[str]] = []
        for candidate in unique_sets:
            if any(existing.issubset(candidate) for existing in minimal):
                continue
            minimal.append(candidate)
        return minimal
