from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from backend.fautree import __version__
from backend.fautree.core.sample import build_sample_project


def _json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, indent=2).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class FAUTreeRequestHandler(BaseHTTPRequestHandler):
    server_version = "FAUTreeAPI/0.1"

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
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

