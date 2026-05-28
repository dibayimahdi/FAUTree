# FAUTree Architecture

## Product Goal

FAUTree should become a professional fault tree analysis environment for PhD-level research and practical safety engineering work.

The platform should support:

- graphical fault tree modeling
- qualitative analysis with minimal cut sets
- quantitative analysis with event probabilities/unavailabilities
- BDD conversion and variable ordering experiments
- product-line and variant-rich fault tree analysis
- report export for papers, thesis chapters, and engineering documentation

## Phase 1 Structure

```text
FAUTree
├─ frontend/              Static professional UI shell
├─ backend/               Python backend skeleton
│  └─ fautree/
│     ├─ api/             HTTP/API entry points
│     └─ core/            Fault tree domain model
├─ examples/              Example FAUTree JSON projects
├─ docs/                  Architecture and roadmap
└─ scripts/               Local development helpers
```

## Target Structure

```text
frontend/
├─ src/
│  ├─ app/
│  ├─ components/
│  ├─ fault-tree-canvas/
│  ├─ analysis-results/
│  └─ api/
└─ package.json

backend/
├─ fautree/
│  ├─ core/
│  │  ├─ model.py
│  │  ├─ validation.py
│  │  └─ expressions.py
│  ├─ qualitative/
│  │  ├─ mocus.py
│  │  └─ minimization.py
│  ├─ quantitative/
│  │  ├─ probability.py
│  │  └─ importance.py
│  ├─ bdd/
│  │  ├─ conversion.py
│  │  ├─ ordering.py
│  │  └─ metrics.py
│  ├─ product_lines/
│  └─ api/
└─ tests/
```

## Data Model

The platform should use FAUTree JSON as its native project format. This avoids depending too early on one external tool and gives us room for product-line extensions.

Core entities:

- project metadata
- nodes: top events, intermediate events, gates, basic events
- edges: parent-child relationships
- analysis settings: mission time, units, variable ordering strategy
- basic event reliability data

## Analysis Direction

1. Normalize the graphical model into an internal fault tree graph.
2. Validate acyclicity, top event reachability, gate arity, and event data.
3. Generate Boolean expressions for qualitative and BDD analysis.
4. Use MOCUS/minimization for minimal cut sets.
5. Use BDDs for exact probability and ordering comparison.
6. Keep Monte Carlo as a separate module for stochastic and variant-rich cases.
