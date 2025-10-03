# API Usage

This guide shows common request flows and usage patterns. All protected endpoints expect `Authorization: Bearer <access_token>`.

Base URLs
- Dev: `http://localhost:8000`
- Prod: `https://api.nex-t1.ai`

## 1) Register (optional) and Login

Register:
```bash
curl -sS -X POST "$BASE/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'
```

Login (form):
```bash
ACCESS_TOKEN=$(curl -sS -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "username=user@example.com" \
  --data-urlencode "password=SecurePass123!" | jq -r .access_token)
```

## 2) Create a Chat Session

```bash
SESSION_JSON=$(curl -sS -X POST "$BASE/api/v1/auth/session" -H "Authorization: Bearer $ACCESS_TOKEN")
SESSION_ID=$(echo "$SESSION_JSON" | jq -r .session_id)
SESSION_TOKEN=$(echo "$SESSION_JSON" | jq -r .token.access_token)
```

Use the `SESSION_TOKEN` for chat endpoints to bind messages to this session.

## 3) Chat (Non‑Streaming)

```bash
curl -sS -X POST "$BASE/api/v1/chatbot/chat" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Give me a quick BTC update."}]}' | jq
```

## 4) Chat (Streaming SSE)

POST stream (SSE response):
```bash
curl -N -sS -X POST "$BASE/api/v1/chatbot/chat/stream" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Two-sentence market recap."}]}'
```

GET SSE via EventSource (browser):
```js
const es = new EventSource(`${BASE}/api/v1/chatbot/chat/stream/sse?` + new URLSearchParams({ q: "Hello", token: SESSION_TOKEN }))
es.onmessage = (ev) => { const chunk = JSON.parse(ev.data); /* chunk.content, chunk.done */ }
```

## 5) Messages: Get / Clear

```bash
curl -sS "$BASE/api/v1/chatbot/messages" -H "Authorization: Bearer $SESSION_TOKEN" | jq
curl -sS -X DELETE "$BASE/api/v1/chatbot/messages" -H "Authorization: Bearer $SESSION_TOKEN"
```

## 6) Multi‑Agent: Preview & Run

Preview:
```bash
curl -sS -X POST "$BASE/api/v1/multi-agent/preview" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Swap 1 ETH to USDC on Base"}' | jq
```

Preview Run:
```bash
curl -sS -X POST "$BASE/api/v1/multi-agent/preview/run" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Swap 1 ETH to USDC on Base","evm_input":{"chain_id":8453,"token_in_address":"0x..","token_out_address":"0x..","amount_in":"1"}}' | jq
```

## 7) Quotes, Risk, Execute (EVM)

Pseudo Quote (reference only):
```bash
curl -sS -X POST "$BASE/api/v1/multi-agent/quote/evm/pseudo" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"input":{"chain_id":1,"token_in_address":"0xC02a...","token_out_address":"0xA0b8...","amount_in":"1.5","slippage_bps":50}}' | jq
```

Risk Preview:
```bash
curl -sS -X POST "$BASE/api/v1/multi-agent/risk/preview" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quote": { /* TradeQuote */ }, "input": { /* RiskCheckInput */ }}' | jq
```

Execute (requires `confirm: true`):
```bash
curl -sS -X POST "$BASE/api/v1/multi-agent/execute/evm" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"input": { /* EvmTradeInput */ }, "confirm": true }' | jq
```

## 8) Tools

DefiLlama:
```bash
curl -sS "$BASE/api/v1/multi-agent/defillama/tools" -H "Authorization: Bearer $SESSION_TOKEN" | jq
curl -sS -X POST "$BASE/api/v1/multi-agent/defillama/invoke" \
  -H "Authorization: Bearer $SESSION_TOKEN" -H "Content-Type: application/json" \
  -d '{"tool_name":"tvl_protocols"}' | jq
```

Binance Subscribe:
```bash
curl -sS -X POST "$BASE/api/v1/multi-agent/binance/subscribe" \
  -H "Authorization: Bearer $SESSION_TOKEN" -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","market":"spot","streams":["aggTrade","kline"],"interval":"1m"}' | jq
```

Chainlink Price:
```bash
curl -sS -X POST "$BASE/api/v1/multi-agent/chainlink/price" \
  -H "Authorization: Bearer $SESSION_TOKEN" -H "Content-Type: application/json" \
  -d '{"chain":"ethereum","pair":"ETH/USD"}' | jq
```

## 9) Tasks & Plans

Create Task:
```bash
curl -sS -X POST "$BASE/api/v1/tasks" \
  -H "Authorization: Bearer $SESSION_TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Monitor Base USDC pools","team":"research","inputs":{"chain":"base"}}' | jq
```

List Tasks / Get Task / Update Progress:
```bash
curl -sS "$BASE/api/v1/tasks?status=in_progress&limit=20" -H "Authorization: Bearer $SESSION_TOKEN" | jq
curl -sS "$BASE/api/v1/tasks/$TASK_ID" -H "Authorization: Bearer $SESSION_TOKEN" | jq
curl -sS -X POST "$BASE/api/v1/tasks/$TASK_ID/progress" \
  -H "Authorization: Bearer $SESSION_TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"in_progress","progress":42,"last_summary":"halfway"}' | jq
```

## 10) Errors & Rate Limits

- Validation: HTTP 422 with `HTTPValidationError` shape.
- Auth: 401 (missing/invalid token), 403 (forbidden).
- Rate Limit: 429 with `slowapi` payload; retry with backoff.

