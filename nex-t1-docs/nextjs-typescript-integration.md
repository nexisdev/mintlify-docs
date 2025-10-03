# Nex-T1 API Integration Guide (Next.js + TypeScript)

This guide shows how to integrate the Nex‑T1 API into a Next.js + TypeScript application. It includes:

- Secure auth + session flow
- Typed API client patterns
- Streaming chat (SSE) and non-streaming chat
- Messages history management
- Multi‑agent endpoints (preview, research, quotes, trading, wallet, tools)
- Tasks + plans endpoints
- Endpoint reference (methods, paths, auth, payloads)

Base URLs:
- Development: `http://localhost:8000`
- Production: `https://api.nex-t1.ai`

Auth: Bearer JWT in `Authorization: Bearer <access_token>` unless stated otherwise.


## Quick Start

1) Create a Next.js app and install deps:

```bash
npx create-next-app@latest nex-t1-app --ts
cd nex-t1-app
```

2) Add environment variables:

Create `.env.local`:

```env
# The Nex‑T1 API base URL
NEXT_PUBLIC_NEX_T1_API_BASE_URL="http://localhost:8000"

# Optional: Use a server-only secret if you will call the API from Route Handlers or Server Actions
NEX_T1_API_BASE_URL="http://localhost:8000"
```

3) Create a minimal typed client `lib/nexT1Client.ts`:

```ts
// lib/nexT1Client.ts
export type Token = {
  access_token: string;
  token_type?: string; // default: "bearer"
  expires_at: string;  // ISO date-time
};

export type TokenResponse = Token;

export type UserResponse = {
  id: number;
  email: string;
  token: Token;
};

export type SessionResponse = {
  session_id: string;  // uuid
  name?: string;
  token: Token;
};

export type Message = { role: "user" | "assistant" | "system"; content: string };
export type ChatRequest = { messages: Message[] };
export type ChatResponse = { messages: Message[] };
export type StreamEvent = { content?: string; done?: boolean };

const baseUrl = process.env.NEX_T1_API_BASE_URL || process.env.NEXT_PUBLIC_NEX_T1_API_BASE_URL || "";

function withAuth(headers: HeadersInit, accessToken?: string): HeadersInit {
  return accessToken ? { ...headers, Authorization: `Bearer ${accessToken}` } : headers;
}

export const NexT1 = {
  // AUTH
  async register(email: string, password: string): Promise<UserResponse> {
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async login(email: string, password: string): Promise<TokenResponse> {
    const body = new URLSearchParams();
    body.set("username", email);
    body.set("password", password);
    // grant_type defaults to password server-side
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async createSession(accessToken: string): Promise<SessionResponse> {
    const res = await fetch(`${baseUrl}/api/v1/auth/session`, {
      method: "POST",
      headers: withAuth({}, accessToken),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async listSessions(accessToken: string) {
    const res = await fetch(`${baseUrl}/api/v1/auth/sessions`, { headers: withAuth({}, accessToken) });
    if (!res.ok) throw await res.json();
    return res.json() as Promise<SessionResponse[]>;
  },

  async updateSessionName(accessToken: string, sessionId: string, name: string) {
    const form = new URLSearchParams();
    form.set("name", name);
    const res = await fetch(`${baseUrl}/api/v1/auth/session/${sessionId}/name`, {
      method: "PATCH",
      headers: withAuth({ "Content-Type": "application/x-www-form-urlencoded" }, accessToken),
      body: form,
    });
    if (!res.ok) throw await res.json();
    return res.json() as Promise<SessionResponse>;
  },

  async deleteSession(accessToken: string, sessionId: string) {
    const res = await fetch(`${baseUrl}/api/v1/auth/session/${sessionId}`, {
      method: "DELETE",
      headers: withAuth({}, accessToken),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // CHAT (non-streaming)
  async chat(accessToken: string, payload: ChatRequest): Promise<ChatResponse> {
    const res = await fetch(`${baseUrl}/api/v1/chatbot/chat`, {
      method: "POST",
      headers: withAuth({ "Content-Type": "application/json" }, accessToken),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // CHAT (SSE streaming via POST /chat/stream)
  async chatStream(accessToken: string, payload: ChatRequest, onChunk: (e: StreamEvent) => void) {
    const res = await fetch(`${baseUrl}/api/v1/chatbot/chat/stream`, {
      method: "POST",
      headers: withAuth({ "Content-Type": "application/json" }, accessToken),
      body: JSON.stringify(payload),
    });
    if (!res.ok || !res.body) throw await res.json();
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Parse Server-Sent Events lines: `data: {json}`\n\n`\n\n`
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        for (const line of part.split("\n")) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data:")) {
            const json = trimmed.slice(5).trim();
            if (json && json !== "[DONE]") {
              try { onChunk(JSON.parse(json)); } catch {}
            }
          }
        }
      }
    }
  },

  // CHAT (SSE streaming via GET /chat/stream/sse)
  // Browser-only example: use EventSource. For Node/server, proxy via a Route Handler.
  chatStreamSSEUrl(query: string, accessToken?: string) {
    const qp = new URLSearchParams({ q: query });
    // server also accepts ?token=... if you cannot set Authorization header
    if (!accessToken) return `${baseUrl}/api/v1/chatbot/chat/stream/sse?${qp.toString()}`;
    // Prefer Authorization header; query token is optional alternative
    qp.set("token", accessToken);
    return `${baseUrl}/api/v1/chatbot/chat/stream/sse?${qp.toString()}`;
  },

  // MESSAGES
  async getMessages(accessToken: string): Promise<ChatResponse> {
    const res = await fetch(`${baseUrl}/api/v1/chatbot/messages`, { headers: withAuth({}, accessToken) });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async clearMessages(accessToken: string) {
    const res = await fetch(`${baseUrl}/api/v1/chatbot/messages`, {
      method: "DELETE",
      headers: withAuth({}, accessToken),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },
};
```


## Auth + Session Flow

- Register: `POST /api/v1/auth/register` with `{ email, password }` → `UserResponse { id, email, token }`.
- Login: `POST /api/v1/auth/login` with form fields `username`, `password` → `TokenResponse`.
- Create session: `POST /api/v1/auth/session` (Authorization required) → `SessionResponse { session_id, name, token }`.
  - Use the returned session-scoped `token.access_token` for chat APIs; it binds requests to the created session.
- Manage sessions:
  - List: `GET /api/v1/auth/sessions`
  - Rename: `PATCH /api/v1/auth/session/{session_id}/name` with form `name`
  - Delete: `DELETE /api/v1/auth/session/{session_id}`

Best practice for Next.js: store the JWT in an HttpOnly secure cookie on the server and attach it to backend calls via Route Handlers or Server Actions, not in `localStorage`.


## Chat Endpoints

Synchronous chat:
- `POST /api/v1/chatbot/chat` with body `{ messages: Message[] }` → `ChatResponse { messages }`

Streaming chat (SSE):
- `POST /api/v1/chatbot/chat/stream` with body `{ messages }` → `text/event-stream` (JSON chunks `{ content, done }`)
- `GET  /api/v1/chatbot/chat/stream/sse?q=<text>` optionally `Authorization` header or `?token=<bearer>` → SSE stream

Messages:
- `GET    /api/v1/chatbot/messages` → `ChatResponse`
- `DELETE /api/v1/chatbot/messages` → `{ message: "Chat history cleared successfully" }`


### Client-side streaming via GET SSE

```ts
// In a Next.js Client Component
import { useEffect, useState } from "react";
import { NexT1 } from "@/lib/nexT1Client";

export default function ChatSSE({ accessToken }: { accessToken: string }) {
  const [text, setText] = useState("");
  const [output, setOutput] = useState("");

  useEffect(() => {
    if (!text) return;
    const url = NexT1.chatStreamSSEUrl(text, accessToken);
    const es = new EventSource(url);
    es.onmessage = (ev) => {
      try {
        const chunk = JSON.parse(ev.data) as { content?: string; done?: boolean };
        if (chunk.content) setOutput((p) => p + chunk.content);
        if (chunk.done) es.close();
      } catch {}
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [text, accessToken]);

  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask something" />
      <pre>{output}</pre>
    </div>
  );
}
```


### Server-side streaming via POST proxy (Route Handler)

This proxies `POST /chat/stream` to the browser as `text/event-stream`.

```ts
// app/api/chat/stream/route.ts (Edge or Node runtime)
import { NextRequest } from "next/server";

export const runtime = "nodejs"; // or "edge" if supported

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const accessToken = req.headers.get("x-session-token"); // or read from cookies/session
  const upstream = await fetch(`${process.env.NEX_T1_API_BASE_URL}/api/v1/chatbot/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ messages }),
  });
  if (!upstream.ok || !upstream.body) {
    return new Response(await upstream.text(), { status: upstream.status });
  }
  // Pass-through SSE body
  return new Response(upstream.body, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
```


## Market & Health

- Health: `GET /` → basic app info; `GET /api/v1/health` → API health info
- Market overview: `GET /api/v1/market/overview?refresh=<boolean>` → `MarketOverviewResponse`

```ts
// Fetch market overview
const res = await fetch(`${process.env.NEXT_PUBLIC_NEX_T1_API_BASE_URL}/api/v1/market/overview`);
const overview = await res.json();
```


## Multi‑Agent Endpoints (Highlights)

- Route Preview: `POST /api/v1/multi-agent/preview` with `{ text }` → `{ intent, entities, team }`
- Preview Run: `POST /api/v1/multi-agent/preview/run` with `{ text, evm_input?, sol_input?, thresholds? }` → `{ intent, team, summary, quote?, risk? }`
- Risk Preview: `POST /api/v1/multi-agent/risk/preview` with `{ quote, input, thresholds?, evm_input?, sol_input? }` → `RiskReport`
- Pseudo Quote (EVM): `POST /api/v1/multi-agent/quote/evm/pseudo` with `{ input: EvmTradeInput }` → `TradeQuote`
- Execute EVM Trade: `POST /api/v1/multi-agent/execute/evm` with `{ input, confirm, ... }` → `EvmExecuteResponse`
- Chainlink Price: `POST /api/v1/multi-agent/chainlink/price` with `{ chain, pair }` → `{ price, decimals, timestamp }`
- EVM Wallet Balance: `POST /api/v1/multi-agent/wallet/evm/balance` with `{ address }` → `{ ... }`
- MCP Tools (DefiLlama/Bitcoin):
  - List: `GET /api/v1/multi-agent/defillama/tools`, `GET /api/v1/multi-agent/bitcoin/tools`
  - Invoke: `POST /api/v1/multi-agent/defillama/invoke` with `{ tool_name, arguments? }`
            `POST /api/v1/multi-agent/bitcoin/invoke` with `{ tool_name, arguments? }`
- Binance (real-time):
  - Tools: `GET /api/v1/multi-agent/binance/tools`
  - Subscribe: `POST /api/v1/multi-agent/binance/subscribe` with `{ symbol, market, streams, interval? }`
  - Unsubscribe: `POST /api/v1/multi-agent/binance/unsubscribe` with `{ subscription_id?, extra? }`


## Tasks + Plans

- Create Plan: `POST /api/v1/plans` with `{ name, description?, base_task: TaskCreate, horizons: PlanHorizon[] }` → `PlanCreateResponse`
- Get Plan: `GET /api/v1/plans/{plan_id}` → `PlanRead`
- Create Task: `POST /api/v1/tasks` with `TaskCreate { title, description?, agent?, team?, kind?, inputs?, scheduled_for? }` → `TaskRead`
- Create Tasks (Batch): `POST /api/v1/tasks/batch` with `BatchTaskCreate { items: TaskCreate[] }` → `TaskListResponse`
- List Tasks: `GET /api/v1/tasks?status=&agent=&team=&plan_id=&limit=&offset=` → `TaskListResponse`
- Get Task: `GET /api/v1/tasks/{task_id}` → `TaskRead`
- Update Task Progress: `POST /api/v1/tasks/{task_id}/progress` with `TaskUpdate { status?, progress?, last_summary?, last_error? }` → `TaskRead`


## Example: Login → Session → Chat

```ts
import { NexT1 } from "@/lib/nexT1Client";

// 1) Login
const login = await NexT1.login("user@example.com", "SecurePass123!");

// 2) Create a session
const session = await NexT1.createSession(login.access_token);

// Use the session-scoped JWT for chat APIs
const sessionToken = session.token.access_token;

// 3) Synchronous chat
const chat = await NexT1.chat(sessionToken, {
  messages: [{ role: "user", content: "What is the price of BTC?" }],
});

// 4) Streaming chat (SSE POST)
await NexT1.chatStream(
  sessionToken,
  { messages: [{ role: "user", content: "Give me a 2-sentence market recap." }] },
  (evt) => {
    if (evt.content) process.stdout.write(evt.content);
  }
);
```


## Error Handling

- Validation errors: HTTP 422 with `HTTPValidationError`
- Auth errors: HTTP 401 for missing/invalid token; 403 for permission issues
- Use `res.ok` checks and inspect JSON `{ detail }` or structured error schemas


## Full Endpoint Reference

Auth
- POST `/api/v1/auth/register` — Register user. Body: `{ email, password }`. Resp: `UserResponse`. Auth: none.
- POST `/api/v1/auth/login` — Login user. Body (form): `username`, `password`. Resp: `TokenResponse`. Auth: none.
- POST `/api/v1/auth/session` — Create chat session. Resp: `SessionResponse`. Auth: Bearer.
- PATCH `/api/v1/auth/session/{session_id}/name` — Rename session. Body (form): `name`. Resp: `SessionResponse`. Auth: Bearer.
- DELETE `/api/v1/auth/session/{session_id}` — Delete session. Resp: `{}`. Auth: Bearer.
- GET `/api/v1/auth/sessions` — List sessions. Resp: `SessionResponse[]`. Auth: Bearer.

Chatbot
- POST `/api/v1/chatbot/chat` — Non-streaming chat. Body: `ChatRequest { messages }`. Resp: `ChatResponse`. Auth: Bearer.
- POST `/api/v1/chatbot/chat/stream` — Streaming chat (SSE). Body: `ChatRequest`. Resp: `text/event-stream` of `{ content, done }`. Auth: Bearer.
- GET  `/api/v1/chatbot/chat/stream/sse` — Streaming chat via GET SSE. Query: `q`, optional `token`. Resp: `text/event-stream`. Auth: Bearer or `token` query.
- GET  `/api/v1/chatbot/messages` — Current session messages. Resp: `ChatResponse`. Auth: Bearer.
- DELETE `/api/v1/chatbot/messages` — Clear current session history. Resp: `{ message }`. Auth: Bearer.

Market
- GET `/api/v1/market/overview` — Twice-daily snapshot; `refresh?=boolean`. Resp: `MarketOverviewResponse`. Auth: none.

Multi‑Agent
- POST `/api/v1/multi-agent/preview` — Route preview. Body: `{ text }`. Resp: `{ intent, entities, team }`. Auth: Bearer.
- POST `/api/v1/multi-agent/preview/run` — Full preview. Body: `PreviewRunRequest`. Resp: `PreviewRunResponse`. Auth: Bearer.
- POST `/api/v1/multi-agent/risk/preview` — Risk evaluation. Body: `RiskPreviewRequest`. Resp: `RiskReport`. Auth: Bearer.
- POST `/api/v1/multi-agent/quote/evm/pseudo` — Reference quote (EVM). Body: `EvmPseudoQuoteRequest`. Resp: `TradeQuote`. Auth: Bearer.
- POST `/api/v1/multi-agent/execute/evm` — Execute EVM trade. Body: `EvmExecuteRequest`. Resp: `EvmExecuteResponse`. Auth: Bearer.
- POST `/api/v1/multi-agent/chainlink/price` — Chainlink price feed. Body: `{ chain, pair }`. Resp: `{ price, decimals, timestamp }`. Auth: Bearer.
- POST `/api/v1/multi-agent/wallet/evm/balance` — EVM wallet balance. Body: `{ address }`. Resp: object. Auth: Bearer.
- GET  `/api/v1/multi-agent/defillama/tools` — List MCP tools. Resp: `object[]`. Auth: Bearer.
- POST `/api/v1/multi-agent/defillama/invoke` — Invoke tool. Body: `{ tool_name, arguments? }`. Resp: object. Auth: Bearer.
- GET  `/api/v1/multi-agent/bitcoin/tools` — List MCP tools. Resp: `object[]`. Auth: Bearer.
- POST `/api/v1/multi-agent/bitcoin/invoke` — Invoke tool. Body: `{ tool_name, arguments? }`. Resp: object. Auth: Bearer.
- GET  `/api/v1/multi-agent/binance/tools` — List MCP tools. Resp: `object[]`. Auth: Bearer.
- POST `/api/v1/multi-agent/binance/subscribe` — Subscribe. Body: `{ symbol, market, streams, interval? }`. Resp: object. Auth: Bearer.
- POST `/api/v1/multi-agent/binance/unsubscribe` — Unsubscribe. Body: `{ subscription_id?, extra? }`. Resp: object. Auth: Bearer.

Tasks & Plans
- POST `/api/v1/plans` — Create plan. Body: `PlanCreate`. Resp: `PlanCreateResponse`. Auth: Bearer.
- GET  `/api/v1/plans/{plan_id}` — Get plan. Resp: `PlanRead`. Auth: Bearer.
- POST `/api/v1/tasks` — Create task. Body: `TaskCreate`. Resp: `TaskRead`. Auth: Bearer.
- POST `/api/v1/tasks/batch` — Create tasks batch. Body: `BatchTaskCreate`. Resp: `TaskListResponse`. Auth: Bearer.
- GET  `/api/v1/tasks` — List tasks. Query: `status, agent, team, plan_id, limit, offset`. Resp: `TaskListResponse`. Auth: Bearer.
- GET  `/api/v1/tasks/{task_id}` — Get task. Resp: `TaskRead`. Auth: Bearer.
- POST `/api/v1/tasks/{task_id}/progress` — Update progress. Body: `TaskUpdate`. Resp: `TaskRead`. Auth: Bearer.

Health
- GET `/` — App info.
- GET `/api/v1/health` — API health.
- GET `/health` — System health (duplicate root-level health path).


## Notes for AI/Agent Automation

- Always attach `Authorization: Bearer <access_token>` except for public endpoints (`/`, `/api/v1/health`, `/api/v1/market/overview`, and auth/register/login).
- Preferred chat session flow: `login → create session → use session.token.access_token for chat/messages`.
- SSE events in streaming endpoints are JSON lines with shape `{ content?: string, done?: boolean }`. Concatenate `content` in order; stop when `done === true`.
- Use `application/x-www-form-urlencoded` for login and session name update.
- Validation errors return HTTP 422; inspect JSON for fields.
- Idempotency keys and thresholds are optional fields on trading/risk endpoints where applicable.


## Optional: OpenAPI Type Generation

You can generate TypeScript types from `openapi.yaml` or `openapi.json` using tools like `openapi-typescript` and use them in your client wrapper for end-to-end type safety.

