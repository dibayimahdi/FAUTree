from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from backend.fautree import __version__
from backend.fautree.core.minimal_cut_sets import compute_minimal_cut_sets
from backend.fautree.core.model import FaultTreeProject
from backend.fautree.core.sample import build_sample_project


def _json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, indent=2).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class FAUTreeRequestHandler(BaseHTTPRequestHandler):
    server_version = "FAUTreeAPI/0.1"

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        if self.path == "/health":
            _json_response(
                self,
                200,
                {
                    "status": "ok",
                    "service": "FAUTree API",
                    "version": __version__,
                },
            )
            return

        if self.path == "/api/projects/sample":
            project = build_sample_project()
            _json_response(
                self,
                200,
                {
                    "project": project.to_dict(),
                    "validation": project.validate(),
                },
            )
            return

        if self.path == "/api/schema":
            _json_response(
                self,
                200,
                {
                    "schemaVersion": "0.1.0",
                    "nodeTypes": ["top_event", "intermediate_event", "basic_event", "gate"],
                    "gateTypes": ["AND", "OR", "K_OF_N"],
                    "requiredEdges": ["source", "target"],
                },
            )
            return

        _json_response(
            self,
            404,
            {
                "error": "Not found",
                "path": self.path,
            },
        )

    def do_POST(self) -> None:
        if self.path == "/api/analyze/minimal-cut-sets":
            try:
                project = FaultTreeProject.from_dict(self._read_json_body())
                cut_sets = compute_minimal_cut_sets(project)
                _json_response(
                    self,
                    200,
                    {
                        "algorithm": "MOCUS-style top-down expansion",
                        "project": project.project.to_dict(),
                        "minimalCutSets": [cut_set.to_dict() for cut_set in cut_sets],
                        "count": len(cut_sets),
                    },
                )
            except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
                _json_response(
                    self,
                    400,
                    {
                        "error": "Could not compute minimal cut sets",
                        "detail": str(error),
                    },
                )
            return

        _json_response(
            self,
            404,
            {
                "error": "Not found",
                "path": self.path,
            },
        )

    def _read_json_body(self) -> dict[str, Any]:
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length)
        payload = json.loads(raw_body.decode("utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("Request body must be a JSON object.")
        return payload

    def log_message(self, format: str, *args: Any) -> None:
        return


def run() -> None:
    host = os.getenv("FAUTREE_API_HOST", "127.0.0.1")
    port = int(os.getenv("FAUTREE_API_PORT", "8000"))
    server = ThreadingHTTPServer((host, port), FAUTreeRequestHandler)
    print(f"FAUTree API listening on http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
