# Infrastructure Overview

This document summarizes the production‑ready infrastructure for the Nex‑T1 FastAPI + LangGraph service.

## Components

- API: FastAPI app with LangGraph orchestration, JWT auth, SSE streaming, Prometheus metrics, structured logging.
- Database: PostgreSQL (pgvector image) for persistence.
- Reverse Proxy: Optional Nginx proxy/SSL termination in production.
- Observability: Prometheus + Grafana, cAdvisor for container metrics.
- Orchestration: Docker Compose for local/prod single host; Kubernetes manifests for clustered deployments.

## Local Development (Compose)

Defined in `docker-compose.yml`:
- `db`: `pgvector/pgvector:pg16`, health checks, volume `postgres-data`.
- `app`: mounts `./app`, exposes `8000`, reads `.env.development` by default, has health checks to `/health`.
- `prometheus` and `grafana`: metrics pipeline with `./prometheus/prometheus.yml` and persisted Grafana storage.
- `cadvisor`: container metrics.

Network: `monitoring` bridge. Volumes: `postgres-data`, `grafana-storage`.

## Production (Compose)

Defined in `docker-compose.prod.yml`:
- Hardened `db` with init SQL/scripts, resource limits, health checks.
- `app` with `APP_ENV=production`, health checks, resource limits, logging options.
- `prometheus`, `grafana`, `cadvisor` with persisted volumes and tuned flags.
- `nginx` reverse proxy with `./nginx/nginx.conf` and `./nginx/ssl`.

Volumes: `postgres-data-prod`, `grafana-storage`, `prometheus-data`. Network: `langgraph-network` with custom subnet.

## Kubernetes

Manifests in `kubernetes/deployment.yaml`:
- Deployment: 3 replicas, rolling updates, resource requests/limits.
- Probes: startup, liveness, readiness to `/health`.
- Metrics: Prometheus scrape annotations on pods and service.
- Service: `ClusterIP` on port 80 → container `8000`.
- HPA: targets CPU and memory, min=3, max=20, scaling behavior configured.
- Security: non‑root user, capability drop, read‑only configs.

Prereqs: namespace, secrets, configmaps, ingress controller; see comments in the manifest.

## Metrics & Logging

- Metrics endpoint: `/metrics` via `starlette_prometheus` middleware (configured in `app/core/metrics.py`).
- Custom metrics: HTTP request counters, LLM inference, MCP tool usage, coordinator timings.
- Logging: `structlog` with JSONL file logs in `./logs`, console logs, environment‑aware formatting (see `app/core/logging.py`).

## Security & Rate Limiting

- JWT bearer auth for all protected endpoints.
- CORS via `settings.ALLOWED_ORIGINS`.
- Rate limiting via `slowapi` (see `app/core/limiter.py`), with per‑endpoint limits from `settings.RATE_LIMIT_ENDPOINTS` and default limits in `settings.RATE_LIMIT_DEFAULT`.

## API Documentation

- Swagger UI: `/docs`
- Redoc: `/redoc`
- Scalar API Reference: `/reference` (serves `/api/v1/openapi.json`), configurable at `/scalar.config.json`.
- Convenience redirect: `/openapi.json` → `/api/v1/openapi.json`.

## Background Schedulers

- Market Overview Scheduler: optional twice‑daily snapshot task (08:00 and 20:00 America/New_York) if enabled in settings.
- Task Scheduler: background task execution framework started on app startup.

## MCP (Model Context Protocol)

- Optional MCP mounting controlled by settings (see `app/main.py`).
- For Exa MCP details and enablement, see `docs/EXA_MCP.md`.

