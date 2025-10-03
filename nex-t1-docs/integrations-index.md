# Nex-T1 API Integrations Index

This index links to framework-specific guides for integrating the Nex‑T1 API.

- Next.js + TypeScript: docs/nextjs-typescript-integration.md
- Vue 3 + TypeScript (Vite): docs/vue3-typescript-integration.md
- Vanilla JavaScript + HTML: docs/javascript-html-integration.md
- Rust + reqwest: docs/rust-reqwest-integration.md

Notes
- All guides cover the same core flows: auth/login, session creation and usage, non‑streaming chat, SSE streaming (both POST proxy and/or GET EventSource), messages, and a compact endpoint reference for multi‑agent, tasks, market, and health.
- Always prefer sending the session‑scoped token (from `SessionResponse`) when calling chat endpoints to bind requests to a session.
