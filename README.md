# FAUTree

FAUTree is a fault tree analysis platform with a graphical editor, Boolean expression builder, and analysis views for qualitative, quantitative, and BDD outputs.

This repository is currently in **public beta** and under active development.

## Current capabilities

- Graphical fault tree editing with event/gate tools
- Boolean expression input and conversion to a graphical tree
- Fault tree export/import (`.fautree.json`) and import of `.sbe`
- Analysis panels for:
  - Qualitative results (minimal cut sets)
  - Quantitative metrics
  - BDD summaries and BDD workspace view

## Quick start

### 1) Start the frontend

From repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start_frontend.ps1
```

Open:

```text
http://localhost:5173/frontend/
```

### 2) Start the backend (separate terminal)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start_backend.ps1
```

Useful endpoints:

```text
http://localhost:8000/health
http://localhost:8000/api/projects/sample
http://localhost:8000/api/schema
```

## Typical workflow

1. Build a tree in **Graphical** mode or paste a Boolean expression in **Boolean** mode.
2. Click **Generate Fault Tree** (from Boolean mode) when needed.
3. Click **Run Analysis** to populate qualitative, quantitative, and BDD result panels.
4. Use **Generate BDD** in the BDD section after analysis is available.

## Project structure

- `frontend/`: dependency-free web UI (`index.html`, `styles.css`, `app.js`)
- `backend/`: Python analysis and API server
- `examples/`: sample projects and SBE examples
- `docs/`: architecture notes and roadmap
- `scripts/`: local startup scripts for frontend/backend

## Testing

Backend tests:

```powershell
python -m pip install pytest
python -m pytest .\backend\tests
```

## Roadmap

See [docs/roadmap.md](./docs/roadmap.md) for planned improvements.

## License

All Rights Reserved. See [LICENSE](./LICENSE).
