# FAUTree

FAUTree is a graphical platform for qualitative, quantitative, and BDD-based fault tree analysis.

This repository currently contains the Phase 1 foundation:

- a professional dependency-free frontend shell
- a lightweight Python backend/API skeleton
- a first JSON project format for fault tree models
- example data and architecture documentation

## Run the Phase 1 frontend

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start_frontend.ps1
```

Then open:

```text
http://localhost:5173/frontend/
```

The frontend shell is intentionally dependency-free for Phase 1 so it runs before npm/React tooling is configured.

## Run the backend skeleton

In a second terminal:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start_backend.ps1
```

Useful endpoints:

```text
http://localhost:8000/health
http://localhost:8000/api/projects/sample
http://localhost:8000/api/schema
```

## Phase 2A editor workflow

In the frontend:

- Click `+` in the Project panel to start a new empty fault tree with one top event.
- Rename the project with the Project title field.
- Select a node, edit its label/type/rate, and click Apply.
- Choose a child type, then add child or sibling nodes.
- Use Move Up/Move Down to reorder sibling nodes.
- Use Export to save a `.fautree.json` project file.
- Use Import to load a saved FAUTree JSON project.
- Use Textual mode to edit a tree as lines such as `System failure = OR(A, B)` and `A = BASIC(1e-6)`.

## Next phases

Phase 2 will replace the static canvas with a proper graph editor and connect the UI to the backend model. The recommended target stack remains React + TypeScript + React Flow for the frontend and Python analysis modules behind an API.
