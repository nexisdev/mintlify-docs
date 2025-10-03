# Example Usage Snippets

This document provides copy‑paste examples in multiple languages for common flows.

Set a base URL first:
```bash
export BASE=http://localhost:8000
```

## Bash + curl

Login and create session:
```bash
ACCESS_TOKEN=$(curl -sS -X POST "$BASE/api/v1/auth/login" -H "Content-Type: application/x-www-form-urlencoded" --data-urlencode "username=user@example.com" --data-urlencode "password=SecurePass123!" | jq -r .access_token)

SESSION_JSON=$(curl -sS -X POST "$BASE/api/v1/auth/session" -H "Authorization: Bearer $ACCESS_TOKEN")
SESSION_TOKEN=$(echo "$SESSION_JSON" | jq -r .token.access_token)
```

Chat (non‑stream):
```bash
curl -sS -X POST "$BASE/api/v1/chatbot/chat" -H "Authorization: Bearer $SESSION_TOKEN" -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"Hello!"}]}' | jq
```

Chat (streaming, POST SSE):
```bash
curl -N -sS -X POST "$BASE/api/v1/chatbot/chat/stream" -H "Authorization: Bearer $SESSION_TOKEN" -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"Stream this."}]}'
```

## Node.js (TypeScript)

```ts
// npm i node-fetch@3
import fetch from 'node-fetch';

const BASE = process.env.BASE || 'http://localhost:8000';

async function main() {
  const form = new URLSearchParams();
  form.set('username', 'user@example.com');
  form.set('password', 'SecurePass123!');
  const tok = await fetch(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
  const { access_token } = await tok.json();

  const sess = await fetch(`${BASE}/api/v1/auth/session`, { method: 'POST', headers: { Authorization: `Bearer ${access_token}` } });
  const s = await sess.json();
  const sessionToken = s.token.access_token as string;

  const chat = await fetch(`${BASE}/api/v1/chatbot/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` }, body: JSON.stringify({ messages: [{ role: 'user', content: 'Hi' }] }) });
  console.log(await chat.json());
}

main().catch(console.error);
```

Streaming SSE (Node, manual parse):
```ts
import fetch from 'node-fetch';

async function stream(sessionToken: string) {
  const res = await fetch(`${BASE}/api/v1/chatbot/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'Stream please' }] }),
  });
  if (!res.body) throw new Error('no body');
  const reader = (res.body as any).getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      for (const line of part.split('\n')) {
        const t = line.trim();
        if (t.startsWith('data:')) {
          const j = t.slice(5).trim();
          if (j && j !== '[DONE]') console.log(JSON.parse(j));
        }
      }
    }
  }
}
```

## Python (requests)

```python
import os, json, requests

BASE = os.getenv('BASE', 'http://localhost:8000')

tok = requests.post(f"{BASE}/api/v1/auth/login", data={'username':'user@example.com','password':'SecurePass123!'}).json()
access_token = tok['access_token']

sess = requests.post(f"{BASE}/api/v1/auth/session", headers={'Authorization': f'Bearer {access_token}'}).json()
session_token = sess['token']['access_token']

chat = requests.post(f"{BASE}/api/v1/chatbot/chat", headers={'Authorization': f'Bearer {session_token}'}, json={'messages':[{'role':'user','content':'Hello'}]}).json()
print(chat)

# Streaming: manual SSE parsing
with requests.post(f"{BASE}/api/v1/chatbot/chat/stream", headers={'Authorization': f'Bearer {session_token}'}, json={'messages':[{'role':'user','content':'Stream now'}]}, stream=True) as r:
    for line in r.iter_lines(decode_unicode=True):
        if not line:
            continue
        if line.startswith('data:'):
            payload = line[5:].strip()
            if payload and payload != '[DONE]':
                print(json.loads(payload))
```

## cURL: Tools

```bash
curl -sS "$BASE/api/v1/multi-agent/defillama/tools" -H "Authorization: Bearer $SESSION_TOKEN" | jq
curl -sS -X POST "$BASE/api/v1/multi-agent/bitcoin/invoke" -H "Authorization: Bearer $SESSION_TOKEN" -H "Content-Type: application/json" -d '{"tool_name":"some_tool"}' | jq
```

