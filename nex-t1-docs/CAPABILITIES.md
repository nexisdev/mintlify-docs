# Capabilities Overview

This document summarizes the system’s functional capabilities exposed via the API.

## Authentication & Sessions

- User registration and login with JWT bearer tokens.
- Session creation for chat; returns a session‑scoped token for message binding.
- Session listing, renaming, deletion.

## Chat (LangGraph‑Backed)

- Non‑streaming chat: returns full message history including assistant reply.
- Streaming chat over Server‑Sent Events (SSE):
  - POST `/api/v1/chatbot/chat/stream` (SSE in response body)
  - GET `/api/v1/chatbot/chat/stream/sse` (EventSource‑friendly)
- Message history retrieval and clearing.

## Multi‑Agent Preview & Orchestration

- Route Preview: intent detection, entity extraction, assigned team.
- Preview Run: executes end‑to‑end preview including route, quotes, risk.
- Research Preview: aggregate data across multiple sources (The Graph, Dune, DefiLlama, sentiment).

## Trading & Market

- Pseudo EVM Quote using Chainlink reference prices (non‑executable).
- Execute EVM trades with risk checks and confirmation gating.
- Chainlink price feed lookup.
- Wallet balance (EVM) helper.
- Market Overview snapshot (twice daily), with news, prices, fear/greed, sentiment summary.

## Tooling Adapters (MCP‑Style)

- DefiLlama tools: list and invoke.
- Bitcoin tools: list and invoke.
- Binance tools: list; real‑time subscribe/unsubscribe to streams.
- Optional Exa MCP bridge support (see `docs/EXA_MCP.md`).

## Tasks & Plans

- Create/list tasks; fetch single task.
- Update task progress (status, percent, summaries/errors).
- Create plan from a base task; fetch plan with associated tasks.

## Observability & Operations

- `/health` and `/api/v1/health` health checks.
- Prometheus metrics; Grafana dashboards via Compose.
- Structured JSON logging with per‑env formatting.

