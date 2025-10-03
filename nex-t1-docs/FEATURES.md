# Features

This document highlights key product and platform features.

## API & Developer Experience

- OpenAPI 3.1 schema with live Swagger/Redoc/Scalar UIs.
- Consistent JSON schemas across auth, chat, multi‑agent, and tasks.
- SSE streaming for real‑time chat.
- Session‑scoped tokens to bind conversations.

## Security & Governance

- JWT bearer authentication.
- Rate limiting via `slowapi` with per‑endpoint policies.
- CORS configuration with explicit allowed origins.

## Reliability & Operations

- Health checks for root and API.
- Prometheus metrics and prebuilt Grafana dashboards via Compose.
- Structured JSON logging (file + console) with env‑aware formatting.
- Kubernetes readiness/liveness/startup probes; HPA for autoscaling.

## Multi‑Agent Foundations

- Route preview and end‑to‑end preview runs (route, quote, risk).
- Risk preview with configurable thresholds.
- Tool adapters (DefiLlama, Bitcoin, Binance); Chainlink price feed.
- Simulated quotes (EVM) and gated execute flow with confirmation.

## Tasking & Scheduling

- Plans from base tasks; tasks with progress/status updates.
- Background scheduler for market overview; discrete task scheduler service.

## Market & Research

- Twice‑daily crypto market overview snapshot (summary, news, prices, sentiment).
- Research preview across The Graph/Dune/DefiLlama/sentiment.

