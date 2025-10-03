Generative UI Streaming: Client Integration

Overview
- The `/api/v1/chatbot/chat/stream` (POST) and `/api/v1/chatbot/chat/stream/sse?q=...&token=...` (GET, native EventSource) endpoints stream mixed events:
  - `{"event":"text","content":"...","done":false}`: text tokens
  - `{"event":"ui","ui":{...},"done":false}`: UI blocks (see kinds below)
  - `{"event":"end","done":true}`: stream completion
- UI blocks follow schemas in `app/schemas/ui.py`. Map `ui.kind` to a React component.

SSE Consumption (TypeScript, GET)
```ts
type StreamEvent = {
  event: 'text' | 'ui' | 'end' | 'error';
  content?: string;
  ui?: any; // Use generated types if you share models
  done?: boolean;
};

// Note: EventSource cannot set Authorization headers. Supply JWT via `token` query param,
// or rely on same-origin cookies if your auth is cookie-based (not default here).
export function startChatStreamSSE(query: { q: string; token: string }, onEvent: (evt: StreamEvent) => void) {
  const es = new EventSource(`/api/v1/chatbot/chat/stream/sse?q=${encodeURIComponent(query.q)}&token=${encodeURIComponent(query.token)}`);
  es.onmessage = (e) => onEvent(JSON.parse(e.data));
  es.onerror = () => { onEvent({ event: 'error', content: 'stream_error', done: true }); es.close(); };
  return () => es.close();
}
```

React Renderer (simplified)
```tsx
import React from 'react';
import { UIBlockRenderer } from '../../examples/frontend/react/src/components/UIBlockRenderer';

export function UIBlockView({ ui }: { ui: any }) {
  switch (ui.kind) {
    case 'price_chart':
      return <PriceChart {...ui} />;
    case 'volume_chart':
      return <VolumeChart {...ui} />;
    case 'asset_table':
      return <AssetTable {...ui} />;
    case 'token_logo':
      return <TokenLogo {...ui} />;
    case 'nft_grid':
      return <NftGrid {...ui} />;
    case 'wallet_holdings':
      return <WalletHoldings {...ui} />;
    case 'wallet_balance':
      return <WalletBalance {...ui} />;
    case 'wallet_pnl':
      return <WalletPnL {...ui} />;
    case 'sign_request':
      return <SignRequest {...ui} />;
    default:
      return null;
  }
}
```

Chart Components
- Use your preferred library (Recharts, Chart.js, Visx, lightweight ECharts). Example props:
  - `price_chart`: `{ title?, symbol?, pair?, currency?, range?, data: [{t, price}] }`
  - `volume_chart`: `{ title?, symbol?, pair?, data: [{t, volume}] }`

Tables and Wallet
- `asset_table`: `{ title?, rows: [{symbol, name?, price?, change_24h_pct?, volume_24h?, logo_url?}] }`
- `wallet_holdings`: `{ wallet_address, chain?, rows: [{symbol, amount, usd_value?, logo_url?}] }`
- `wallet_balance`: `{ wallet_address, chain?, total_usd?, breakdown: HoldingRow[] }`
- `wallet_pnl`: `{ wallet_address, period?, pnl_usd?, pnl_pct?, timeseries: [{t,pnl_usd}] }`

NFTs
- `nft_grid`: `{ title?, items: [{token_id?, name?, collection?, image_url?, permalink?}] }`

Wallet Signing
- `sign_request`: `{ chain, wallet_address, title?, message?, payload, disclaimer? }`
- On UI, detect user’s connected wallet (e.g., WalletConnect, RainbowKit, Phantom) and route `payload` to the appropriate signer:
  - EVM: use `ethers`/`viem` to `signMessage`, `sendTransaction`, or `signTypedData` based on payload shape.
  - Solana: use `@solana/wallet-adapter` to `signTransaction`/`signMessage`.
  - Display `disclaimer` prominently; require explicit user confirmation.

Security Notes
- Never auto-execute sign requests. Always prompt and show details.
- Validate addresses and network; warn on mismatches.
- Throttle UI spam by debouncing consecutive `sign_request` blocks.

React Hook and Components (drop-in)
- `examples/frontend/react/src/hooks/useChatStream.ts` — unified streaming for POST and SSE.
- `examples/frontend/react/src/components/UIBlockRenderer.tsx` — maps `ui.kind` to components.
- Blocks: `PriceChart`, `VolumeChart`, `AssetTable`, `TokenLogo`, `NftGrid`, `WalletHoldings`, `WalletBalance`, `WalletPnL`, `SignRequest`.
