# FAUTree Roadmap

## Phase 1: Environment and Professional Shell

- Create repository structure.
- Add a professional graphical UI shell.
- Add a lightweight Python API skeleton.
- Define the first FAUTree JSON project format.
- Add example model and run scripts.

## Phase 2: Graphical Fault Tree Editor

- Move frontend to React + TypeScript.
- Add a proper graph editor with node creation, movement, connection, and validation.
- Add project save/load using FAUTree JSON.
- Add node property editing for gates and basic events.

## Phase 3: Qualitative Analysis

- Refactor MOCUS into a reusable Python module.
- Compute cut sets and minimal cut sets.
- Highlight selected cut sets in the graphical editor.
- Add tests with known benchmark trees.

## Phase 4: Quantitative Analysis

- Add probability/unavailability quantification and document the selected quantitative model.
- Compute top event probability from cut sets.
- Add exact probability through BDD evaluation.
- Add result tables and sensitivity views.

## Phase 5: BDD Conversion

- Convert fault trees into Boolean expressions.
- Build BDDs using the Python dd package.
- Compare variable ordering strategies.
- Export BDD metrics and visualizations.

## Phase 6: PhD-Ready Reporting

- Export PDF/HTML reports.
- Include diagrams, assumptions, event tables, cut sets, probability results, and BDD metrics.
- Add case-study templates for PROFIBUS, PROFINET, and product-line examples.
