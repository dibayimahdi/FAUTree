from __future__ import annotations

import json
import os
import threading
import time
from collections import defaultdict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from backend.fautree import __version__
from backend.fautree.core.bdd import compute_bdd_analysis
from backend.fautree.core.minimal_cut_sets import compute_minimal_cut_sets
from backend.fautree.core.model import FaultTreeProject
from backend.fautree.core.sample import build_sample_project


def _parse_allowed_origins() -> set[str]:
    configured = os.getenv(
        "FAUTREE_ALLOWED_ORIGINS",
        "https://fautree.com,https://www.fautree.com,http://localhost:5173",
    )
    return {origin.strip() for origin in configured.split(",") if origin.strip()}


ALLOWED_ORIGINS = _parse_allowed_origins()
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("FAUTREE_RATE_LIMIT_WINDOW_SECONDS", "60"))
RATE_LIMIT_MAX_REQUESTS = int(os.getenv("FAUTREE_RATE_LIMIT_MAX_REQUESTS", "60"))
_RATE_LIMIT_BUCKETS: dict[str, deque[float]] = defaultdict(deque)
_RATE_LIMIT_LOCK = threading.Lock()


def _origin_allowed(origin: str | None) -> bool:
    return bool(origin) and origin in ALLOWED_ORIGINS


def _apply_cors_headers(handler: BaseHTTPRequestHandler, origin: str | None) -> None:
    handler.send_header("Vary", "Origin")
    if _origin_allowed(origin):
        handler.send_header("Access-Control-Allow-Origin", origin)
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")


def _check_rate_limit(client_key: str) -> tuple[bool, int]:
    now = time.time()
    with _RATE_LIMIT_LOCK:
        bucket = _RATE_LIMIT_BUCKETS[client_key]
        cutoff = now - RATE_LIMIT_WINDOW_SECONDS
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= RATE_LIMIT_MAX_REQUESTS:
            retry_after = max(1, int(bucket[0] + RATE_LIMIT_WINDOW_SECONDS - now))
            return False, retry_after
        bucket.append(now)
    return True, 0


def _json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, indent=2).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    _apply_cors_headers(handler, handler.headers.get("Origin"))
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class FAUTreeRequestHandler(BaseHTTPRequestHandler):
    server_version = "FAUTreeAPI/0.1"

    def do_OPTIONS(self) -> None:
        origin = self.headers.get("Origin")
        if origin and not _origin_allowed(origin):
            self.send_response(403)
            _apply_cors_headers(self, origin)
            self.end_headers()
            return
        self.send_response(204)
        _apply_cors_headers(self, origin)
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
                    "nodeTypes": ["top_event", "intermediate_event", "basic_event", "undeveloped_event", "gate"],
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
            if not self._allow_rate_limited_request():
                return
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

        if self.path == "/api/analyze/bdd":
            if not self._allow_rate_limited_request():
                return
            try:
                payload = self._read_json_body()
                project = FaultTreeProject.from_dict(payload)
                ordering = project.analysis.variable_ordering
                bdd_result = compute_bdd_analysis(project, ordering, project.analysis.custom_variable_order)
                _json_response(
                    self,
                    200,
                    {
                        "algorithm": "Internal reduced ordered binary decision diagram",
                        "project": project.project.to_dict(),
                        "bdd": bdd_result.to_dict(),
                    },
                )
            except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
                _json_response(
                    self,
                    400,
                    {
                        "error": "Could not compute BDD analysis",
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

    def _allow_rate_limited_request(self) -> bool:
        client_ip = self.client_address[0] if self.client_address else "unknown"
        allowed, retry_after = _check_rate_limit(client_ip)
        if allowed:
            return True
        self.send_response(429)
        _apply_cors_headers(self, self.headers.get("Origin"))
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Retry-After", str(retry_after))
        payload = json.dumps(
            {
                "error": "Rate limit exceeded",
                "detail": f"Max {RATE_LIMIT_MAX_REQUESTS} requests per {RATE_LIMIT_WINDOW_SECONDS} seconds.",
            },
            indent=2,
        ).encode("utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
        return False

    def log_message(self, format: str, *args: Any) -> None:
        return


def run() -> None:
    host = os.getenv("FAUTREE_API_HOST", "0.0.0.0")
    port = int(os.getenv("PORT", os.getenv("FAUTREE_API_PORT", "8000")))
    server = ThreadingHTTPServer((host, port), FAUTreeRequestHandler)
    print(f"FAUTree API listening on http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
