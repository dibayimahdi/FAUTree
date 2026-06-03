from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from .model import FaultTreeNode, FaultTreeProject


BDD_FALSE = 0
BDD_TRUE = 1


@dataclass(frozen=True)
class BDDNode:
    variable: str
    low: int
    high: int


@dataclass(frozen=True)
class BDDAnalysisResult:
    ordering: str
    variable_order: tuple[str, ...]
    node_count: int
    exact_probability: float
    root: int
    graph: dict | None = None

    def to_dict(self) -> dict:
        return {
            "ordering": self.ordering,
            "variableOrder": list(self.variable_order),
            "variableCount": len(self.variable_order),
            "nodeCount": self.node_count,
            "exactProbability": self.exact_probability,
            "root": self.root,
            "graph": self.graph,
        }


class BDDManager:
    def __init__(self, variable_order: tuple[str, ...]) -> None:
        self.variable_order = variable_order
        self.variable_rank = {variable: index for index, variable in enumerate(variable_order)}
        self.nodes: dict[int, BDDNode] = {}
        self.unique_table: dict[tuple[str, int, int], int] = {}
        self.next_id = 2

    def variable(self, label: str) -> int:
        return self.make_node(label, BDD_FALSE, BDD_TRUE)

    def make_node(self, variable: str, low: int, high: int) -> int:
        if low == high:
            return low
        key = (variable, low, high)
        if key in self.unique_table:
            return self.unique_table[key]
        node_id = self.next_id
        self.next_id += 1
        self.unique_table[key] = node_id
        self.nodes[node_id] = BDDNode(variable=variable, low=low, high=high)
        return node_id

    def apply(self, operator: str, left: int, right: int) -> int:
        @lru_cache(maxsize=None)
        def apply_cached(left_id: int, right_id: int) -> int:
            if left_id in {BDD_FALSE, BDD_TRUE} and right_id in {BDD_FALSE, BDD_TRUE}:
                left_bool = left_id == BDD_TRUE
                right_bool = right_id == BDD_TRUE
                if operator == "AND":
                    return BDD_TRUE if left_bool and right_bool else BDD_FALSE
                if operator == "OR":
                    return BDD_TRUE if left_bool or right_bool else BDD_FALSE
                raise ValueError(f"Unsupported BDD operator: {operator}")

            variable = self._top_variable(left_id, right_id)
            left_low, left_high = self._cofactor(left_id, variable)
            right_low, right_high = self._cofactor(right_id, variable)
            low = apply_cached(left_low, right_low)
            high = apply_cached(left_high, right_high)
            return self.make_node(variable, low, high)

        return apply_cached(left, right)

    def probability(self, root: int, probabilities: dict[str, float]) -> float:
        @lru_cache(maxsize=None)
        def probability_cached(node_id: int) -> float:
            if node_id == BDD_FALSE:
                return 0.0
            if node_id == BDD_TRUE:
                return 1.0
            node = self.nodes[node_id]
            probability = probabilities.get(node.variable, 0.0)
            return (1.0 - probability) * probability_cached(node.low) + probability * probability_cached(node.high)

        return probability_cached(root)

    def _top_variable(self, left_id: int, right_id: int) -> str:
        variables = []
        if left_id not in {BDD_FALSE, BDD_TRUE}:
            variables.append(self.nodes[left_id].variable)
        if right_id not in {BDD_FALSE, BDD_TRUE}:
            variables.append(self.nodes[right_id].variable)
        return min(variables, key=lambda variable: self.variable_rank[variable])

    def _cofactor(self, node_id: int, variable: str) -> tuple[int, int]:
        if node_id in {BDD_FALSE, BDD_TRUE}:
            return node_id, node_id
        node = self.nodes[node_id]
        if node.variable == variable:
            return node.low, node.high
        return node_id, node_id


class BDDAnalyzer:
    def __init__(self, project: FaultTreeProject, ordering: str, custom_order: tuple[str, ...] = ()) -> None:
        self.project = project
        self.ordering = ordering
        self.custom_order = custom_order
        self.nodes = {node.id: node for node in project.nodes}
        self.children: dict[str, list[str]] = {node.id: [] for node in project.nodes}
        self.basic_event_label_by_id: dict[str, str] = {}
        for edge in project.edges:
            self.children.setdefault(edge.source, []).append(edge.target)
        for node in project.nodes:
            if node.type in {"basic_event", "undeveloped_event"}:
                self.basic_event_label_by_id[node.id] = node.label

    def compute(self) -> BDDAnalysisResult:
        validation_errors = self.project.validate()
        if validation_errors:
            raise ValueError("; ".join(validation_errors))

        variable_order = self._variable_order()
        manager = BDDManager(variable_order)
        root_id = self._top_event().id
        bdd_root = self._build_bdd(root_id, manager)
        probability = manager.probability(bdd_root, self._probabilities_by_label())
        reachable = self._reachable_bdd_ids(manager, bdd_root)

        return BDDAnalysisResult(
            ordering=self.ordering,
            variable_order=variable_order,
            node_count=sum(1 for node_id in reachable if node_id not in {BDD_FALSE, BDD_TRUE}),
            exact_probability=probability,
            root=bdd_root,
            graph=self._graph_payload(manager, bdd_root),
        )

    def _build_bdd(self, node_id: str, manager: BDDManager) -> int:
        node = self._node(node_id)
        child_ids = self.children.get(node_id, [])

        if node.type in {"basic_event", "undeveloped_event"}:
            return manager.variable(node.label)

        if node.type in {"top_event", "intermediate_event"}:
            if len(child_ids) != 1:
                raise ValueError(f"{node.label} must connect to exactly one logic gate.")
            child = self._node(child_ids[0])
            if child.type != "gate":
                raise ValueError(f"{node.label} must connect to an AND or OR gate.")
            return self._build_bdd(child.id, manager)

        if node.type != "gate":
            raise ValueError(f"Unsupported node type: {node.type}")

        if len(child_ids) < 2:
            raise ValueError(f"{node.label} must have at least two input events.")

        child_bdds = [self._build_bdd(child_id, manager) for child_id in child_ids]
        result = child_bdds[0]
        for child_bdd in child_bdds[1:]:
            result = manager.apply(node.gate_type or "", result, child_bdd)
        return result

    def _variable_order(self) -> tuple[str, ...]:
        labels = self._basic_event_labels_in_infix_order()
        if self.ordering == "alphabetical":
            return tuple(sorted(labels))
        if self.ordering == "custom":
            return self._validated_custom_order(labels)
        return tuple(labels)

    def _validated_custom_order(self, labels: list[str]) -> tuple[str, ...]:
        expected = set(labels)
        requested = list(self.custom_order)
        if len(requested) != len(set(requested)):
            raise ValueError("Custom BDD variable order contains duplicate variables.")
        if set(requested) != expected:
            missing = sorted(expected.difference(requested))
            extra = sorted(set(requested).difference(expected))
            details = []
            if missing:
                details.append(f"missing: {', '.join(missing)}")
            if extra:
                details.append(f"unknown: {', '.join(extra)}")
            raise ValueError(f"Custom BDD variable order must contain each leaf event exactly once ({'; '.join(details)}).")
        return tuple(requested)

    def _basic_event_labels_in_infix_order(self) -> list[str]:
        labels: list[str] = []

        def visit(node_id: str) -> None:
            node = self._node(node_id)
            child_ids = self.children.get(node_id, [])
            if node.type in {"basic_event", "undeveloped_event"}:
                if node.label not in labels:
                    labels.append(node.label)
                return
            if not child_ids:
                return
            for child_id in child_ids[:-1]:
                visit(child_id)
            visit(child_ids[-1])

        visit(self._top_event().id)
        return labels

    def _probabilities_by_label(self) -> dict[str, float]:
        probabilities: dict[str, float] = {}
        for node in self.project.nodes:
            if node.type not in {"basic_event", "undeveloped_event"}:
                continue
            probability = node.probability if node.probability is not None else node.failure_rate
            probabilities.setdefault(node.label, float(probability or 0.0))
        return probabilities

    def _top_event(self) -> FaultTreeNode:
        top_events = [node for node in self.project.nodes if node.type == "top_event"]
        if len(top_events) != 1:
            raise ValueError("A fault tree must contain exactly one top event.")
        return top_events[0]

    def _node(self, node_id: str) -> FaultTreeNode:
        node = self.nodes.get(node_id)
        if node is None:
            raise ValueError(f"Node does not exist: {node_id}")
        return node

    def _graph_payload(self, manager: BDDManager, root: int) -> dict | None:
        reachable = self._reachable_bdd_ids(manager, root)
        # Use the drawable graph size, not the manager's internal temporary node
        # count. Some valid formulas create many intermediate nodes that reduce
        # to a much smaller BDD.
        if len(reachable) > 1000:
            return None

        level_counts: dict[int, int] = {}
        graph_nodes = []
        for node_id in sorted(reachable, key=lambda item: (self._bdd_level(manager, item), item)):
            level = self._bdd_level(manager, node_id)
            index = level_counts.get(level, 0)
            level_counts[level] = index + 1

            if node_id == BDD_FALSE:
                label = "0"
                kind = "terminal"
            elif node_id == BDD_TRUE:
                label = "1"
                kind = "terminal"
            else:
                label = manager.nodes[node_id].variable
                kind = "decision"

            graph_nodes.append(
                {
                    "id": node_id,
                    "label": label,
                    "kind": kind,
                    "level": level,
                    "index": index,
                }
            )

        graph_edges = []
        for node_id in sorted(reachable):
            if node_id in {BDD_FALSE, BDD_TRUE}:
                continue
            node = manager.nodes[node_id]
            graph_edges.append({"source": node_id, "target": node.low, "branch": "0"})
            graph_edges.append({"source": node_id, "target": node.high, "branch": "1"})

        return {
            "root": root,
            "nodes": graph_nodes,
            "edges": graph_edges,
        }

    def _reachable_bdd_ids(self, manager: BDDManager, root: int) -> set[int]:
        reachable: set[int] = set()

        def visit(node_id: int) -> None:
            if node_id in reachable:
                return
            reachable.add(node_id)
            if node_id in {BDD_FALSE, BDD_TRUE}:
                return
            node = manager.nodes[node_id]
            visit(node.low)
            visit(node.high)

        visit(root)
        return reachable

    def _bdd_level(self, manager: BDDManager, node_id: int) -> int:
        if node_id in {BDD_FALSE, BDD_TRUE}:
            return len(manager.variable_order)
        return manager.variable_rank[manager.nodes[node_id].variable]


def compute_bdd_analysis(project: FaultTreeProject, ordering: str = "infix", custom_order: tuple[str, ...] = ()) -> BDDAnalysisResult:
    if ordering not in {"alphabetical", "infix", "custom"}:
        raise ValueError(f"Unsupported BDD ordering: {ordering}")
    return BDDAnalyzer(project, ordering, custom_order).compute()
