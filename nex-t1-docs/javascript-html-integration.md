# Nex-T1 API Integration Guide (Vanilla JavaScript + HTML)

This guide shows how to call the Nex‑T1 API from a plain HTML + JavaScript app (no framework).

- Auth + session login flow
- Non‑streaming and streaming chat (SSE)
- Messages history
- Endpoint reference

Base URLs:
- Development: `http://localhost:8000`
- Production: `https://api.nex-t1.ai`

Auth: Bearer JWT in `Authorization: Bearer <access_token>` unless stated otherwise.


## Quick Start

1) Create files

- `index.html`
- `app.js`
- `config.js`

2) Configure base URL

```js
// config.js
export const API_BASE_URL = "http://localhost:8000"; // or https://api.nex-t1.ai
```

3) Minimal HTML UI with streaming

```html
<!-- index.html -->
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Nex‑T1 Vanilla JS Demo</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; }
      input, button { padding: 0.5rem; }
      .row { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
      pre { white-space: pre-wrap; background: #f7f7f9; padding: 0.75rem; border: 1px solid #e1e1e8; }
    </style>
  </head>
  <body>
    <h1>Nex‑T1 Vanilla JS Demo</h1>
    <div class="row">
      <input id="email" placeholder="email" />
      <input id="password" type="password" placeholder="password" />
      <button id="loginBtn">Login</button>
    </div>
    <div class="row">
      <button id="createSessionBtn" disabled>Create Session</button>
      <input id="sessionToken" placeholder="session token" readonly />
    </div>
    <div class="row">
      <input id="prompt" placeholder="Ask something" style="flex:1"/>
      <button id="chatBtn" disabled>Chat</button>
      <button id="streamBtn" disabled>Stream</button>
    </div>
    <h3>Output</h3>
    <pre id="out"></pre>

    <script type="module" src="app.js"></script>
  </body>
  </html>
```

4) Client logic

```js
// app.js
import { API_BASE_URL } from './config.js';

let accessToken = null;
let sessionToken = null;

const $ = (id) => document.getElementById(id);
const out = $('out');

$('loginBtn').onclick = async () => {
  const email = $('email').value;
  const password = $('password').value;
  const body = new URLSearchParams();
  body.set('username', email);
  body.set('password', password);
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) return (out.textContent = 'Login failed');
  const tok = await res.json();
  accessToken = tok.access_token;
  $('createSessionBtn').disabled = false;
  out.textContent = 'Logged in';
};

$('createSessionBtn').onclick = async () => {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/session`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return (out.textContent = 'Create session failed');
  const s = await res.json();
  sessionToken = s.token.access_token;
  $('sessionToken').value = sessionToken;
  $('chatBtn').disabled = false;
  $('streamBtn').disabled = false;
  out.textContent = `Session created: ${s.session_id}`;
};

$('chatBtn').onclick = async () => {
  const prompt = $('prompt').value;
  const res = await fetch(`${API_BASE_URL}/api/v1/chatbot/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) return (out.textContent = 'Chat failed');
  const data = await res.json();
  out.textContent = JSON.stringify(data, null, 2);
};

$('streamBtn').onclick = async () => {
  const prompt = $('prompt').value;
  out.textContent = '';
  const url = `${API_BASE_URL}/api/v1/chatbot/chat/stream/sse?` + new URLSearchParams({ q: prompt, token: sessionToken });
  const es = new EventSource(url);
  es.onmessage = (ev) => {
    try {
      const chunk = JSON.parse(ev.data);
      if (chunk.content) out.textContent += chunk.content;
      if (chunk.done) es.close();
    } catch {}
  };
  es.onerror = () => es.close();
};
```


## Auth + Session Flow

- Login with form fields `username`, `password` → `TokenResponse`.
- Create session → get `SessionResponse` with a session‑scoped `token.access_token`.
- Use session token for chat/messages.
- Optional: register via `POST /api/v1/auth/register`.

Security note: for production, prefer a backend that stores JWT in HttpOnly cookies and proxies API requests.


## Chat Endpoints

- `POST /api/v1/chatbot/chat` → `ChatResponse { messages }`
- `POST /api/v1/chatbot/chat/stream` → SSE stream of `{ content, done }`
- `GET  /api/v1/chatbot/chat/stream/sse?q=...&token=...` → SSE stream
- `GET /api/v1/chatbot/messages` and `DELETE /api/v1/chatbot/messages`


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
