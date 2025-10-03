# Nex-T1 API Integration Guide (Vue 3 + TypeScript)

This guide shows how to integrate the Nex‑T1 API into a Vue 3 + TypeScript (Vite) application.

- Auth + session flow
- Typed API client
- Streaming chat (SSE) and non‑streaming chat
- Messages history management
- Multi‑agent endpoints (preview, research, quotes, trading, wallet, tools)
- Tasks + plans endpoints
- Endpoint reference (methods, paths, auth, payloads)

Base URLs:
- Development: `http://localhost:8000`
- Production: `https://api.nex-t1.ai`

Auth: Bearer JWT in `Authorization: Bearer <access_token>` unless stated otherwise.


## Quick Start

1) Create a Vue + TS app

```bash
npm create vite@latest nex-t1-vue -- --template vue-ts
cd nex-t1-vue
npm install
```

2) Add environment variables

Create `.env` (for dev) or `.env.local`:

```env
VITE_NEX_T1_API_BASE_URL="http://localhost:8000"
```

3) Create a typed client `src/lib/nexT1Client.ts`

```ts
// src/lib/nexT1Client.ts
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
  session_id: string; // uuid
  name?: string;
  token: Token;
};

export type Message = { role: "user" | "assistant" | "system"; content: string };
export type ChatRequest = { messages: Message[] };
export type ChatResponse = { messages: Message[] };
export type StreamEvent = { content?: string; done?: boolean };

const baseUrl = import.meta.env.VITE_NEX_T1_API_BASE_URL as string;

function withAuth(headers: HeadersInit, accessToken?: string): HeadersInit {
  return accessToken ? { ...headers, Authorization: `Bearer ${accessToken}` } : headers;
}

export const NexT1 = {
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

  async chat(accessToken: string, payload: ChatRequest): Promise<ChatResponse> {
    const res = await fetch(`${baseUrl}/api/v1/chatbot/chat`, {
      method: "POST",
      headers: withAuth({ "Content-Type": "application/json" }, accessToken),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

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

  chatStreamSSEUrl(query: string, accessToken?: string) {
    const qp = new URLSearchParams({ q: query });
    if (!accessToken) return `${baseUrl}/api/v1/chatbot/chat/stream/sse?${qp.toString()}`;
    qp.set("token", accessToken);
    return `${baseUrl}/api/v1/chatbot/chat/stream/sse?${qp.toString()}`;
  },

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

4) Example Vue component with SSE (GET)

```vue
<!-- src/components/ChatSSE.vue -->
<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { NexT1 } from '@/lib/nexT1Client'

const accessToken = ref<string>('') // obtain via login + session
const prompt = ref('')
const output = ref('')
let es: EventSource | null = null

watch([prompt, accessToken], ([p, token]) => {
  if (!p || !token) return
  output.value = ''
  if (es) es.close()
  const url = NexT1.chatStreamSSEUrl(p, token)
  es = new EventSource(url)
  es.onmessage = (ev) => {
    try {
      const chunk = JSON.parse(ev.data) as { content?: string; done?: boolean }
      if (chunk.content) output.value += chunk.content
      if (chunk.done) es?.close()
    } catch {}
  }
  es.onerror = () => es?.close()
})

onBeforeUnmount(() => { es?.close() })
</script>

<template>
  <div>
    <input v-model="accessToken" placeholder="session token" />
    <input v-model="prompt" placeholder="Ask something" />
    <pre>{{ output }}</pre>
  </div>
</template>
```


## Auth + Session Flow

- Register: `POST /api/v1/auth/register` with `{ email, password }` → `UserResponse { id, email, token }`.
- Login: `POST /api/v1/auth/login` with `username`, `password` (form) → `TokenResponse`.
- Create session: `POST /api/v1/auth/session` → `SessionResponse { session_id, name, token }`.
  - Use `session.token.access_token` for chat/messages in this session.
- Manage sessions: list, rename, delete.

Best practice: for SPAs, a backend for frontend (BFF) is recommended to store JWT in an HttpOnly cookie and proxy requests.


## Chat Endpoints

- `POST /api/v1/chatbot/chat` → `ChatResponse { messages }`
- `POST /api/v1/chatbot/chat/stream` → SSE stream (`{ content, done }` JSON events)
- `GET  /api/v1/chatbot/chat/stream/sse?q=...` (optionally `?token=...`)
- `GET /api/v1/chatbot/messages` and `DELETE /api/v1/chatbot/messages`


## Multi‑Agent, Tasks & Plans, Market, Health

Same as in the Next.js guide; endpoints are identical. See Full Endpoint Reference below.


## Example: Login → Session → Chat

```ts
import { NexT1 } from '@/lib/nexT1Client'

const login = await NexT1.login('user@example.com', 'SecurePass123!')
const session = await NexT1.createSession(login.access_token)
const sessionToken = session.token.access_token

const chat = await NexT1.chat(sessionToken, {
  messages: [{ role: 'user', content: 'What is the price of BTC?' }],
})

await NexT1.chatStream(
  sessionToken,
  { messages: [{ role: 'user', content: 'Brief market recap.' }] },
  (evt) => { if (evt.content) console.log(evt.content) }
)
```


## Error Handling

- 422 Validation errors; 401/403 auth errors; check `res.ok`.


## Full Endpoint Reference

Auth
- POST `/api/v1/auth/register`
- POST `/api/v1/auth/login`
- POST `/api/v1/auth/session`
- PATCH `/api/v1/auth/session/{session_id}/name`
- DELETE `/api/v1/auth/session/{session_id}`
- GET `/api/v1/auth/sessions`

Chatbot
- POST `/api/v1/chatbot/chat`
- POST `/api/v1/chatbot/chat/stream`
- GET  `/api/v1/chatbot/chat/stream/sse`
- GET  `/api/v1/chatbot/messages`
- DELETE `/api/v1/chatbot/messages`

Market
- GET `/api/v1/market/overview`

Multi‑Agent
- POST `/api/v1/multi-agent/preview`
- POST `/api/v1/multi-agent/preview/run`
- POST `/api/v1/multi-agent/risk/preview`
- POST `/api/v1/multi-agent/quote/evm/pseudo`
- POST `/api/v1/multi-agent/execute/evm`
- POST `/api/v1/multi-agent/chainlink/price`
- POST `/api/v1/multi-agent/wallet/evm/balance`
- GET  `/api/v1/multi-agent/defillama/tools`
- POST `/api/v1/multi-agent/defillama/invoke`
- GET  `/api/v1/multi-agent/bitcoin/tools`
- POST `/api/v1/multi-agent/bitcoin/invoke`
- GET  `/api/v1/multi-agent/binance/tools`
- POST `/api/v1/multi-agent/binance/subscribe`
- POST `/api/v1/multi-agent/binance/unsubscribe`

Tasks & Plans
- POST `/api/v1/plans`
- GET  `/api/v1/plans/{plan_id}`
- POST `/api/v1/tasks`
- POST `/api/v1/tasks/batch`
- GET  `/api/v1/tasks`
- GET  `/api/v1/tasks/{task_id}`
- POST `/api/v1/tasks/{task_id}/progress`

Health
- GET `/`
- GET `/api/v1/health`
- GET `/health`
