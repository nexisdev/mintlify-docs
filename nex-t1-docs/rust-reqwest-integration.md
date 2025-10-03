# Nex-T1 API Integration Guide (Rust + reqwest)

This guide shows how to call the Nex‑T1 API from a Rust application using `tokio` and `reqwest`, including Server‑Sent Events (SSE) streaming.

- Auth + session login flow
- Non‑streaming and streaming chat (SSE)
- Messages history
- Endpoint reference

Base URLs:
- Development: `http://localhost:8000`
- Production: `https://api.nex-t1.ai`

Auth: Bearer JWT in `Authorization: Bearer <access_token>` unless stated otherwise.


## Setup

Create a new binary crate and add dependencies:

```bash
cargo new nex_t1_rust_demo --bin
cd nex_t1_rust_demo
```

Cargo.toml:

```toml
[package]
name = "nex_t1_rust_demo"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.11", features = ["json", "stream", "gzip", "brotli", "deflate"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
futures-util = "0.3"
```


## Typed models

```rust
// src/models.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Token {
    pub access_token: String,
    #[serde(default)]
    pub token_type: Option<String>,
    pub expires_at: String,
}

pub type TokenResponse = Token;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct UserResponse {
    pub id: i64,
    pub email: String,
    pub token: Token,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct SessionResponse {
    pub session_id: String,
    #[serde(default)]
    pub name: Option<String>,
    pub token: Token,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Message {
    pub role: String,   // "user" | "assistant" | "system"
    pub content: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ChatRequest {
    pub messages: Vec<Message>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ChatResponse {
    pub messages: Vec<Message>,
}

#[derive(Debug, Deserialize, Serialize, Clone, Default)]
pub struct StreamEvent {
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub done: Option<bool>,
}
```


## Client helpers

```rust
// src/client.rs
use futures_util::StreamExt;
use reqwest::Client;
use serde_json::json;

use crate::models::*;

pub struct NexT1Client {
    base_url: String,
    http: Client,
}

impl NexT1Client {
    pub fn new(base_url: impl Into<String>) -> Self {
        Self { base_url: base_url.into(), http: Client::new() }
    }

    pub async fn register(&self, email: &str, password: &str) -> reqwest::Result<UserResponse> {
        let res = self.http
            .post(format!("{}/api/v1/auth/register", self.base_url))
            .json(&json!({"email": email, "password": password}))
            .send().await?;
        res.error_for_status()?.json().await
    }

    pub async fn login(&self, email: &str, password: &str) -> reqwest::Result<TokenResponse> {
        let res = self.http
            .post(format!("{}/api/v1/auth/login", self.base_url))
            .form(&[("username", email), ("password", password)])
            .send().await?;
        res.error_for_status()?.json().await
    }

    pub async fn create_session(&self, access_token: &str) -> reqwest::Result<SessionResponse> {
        let res = self.http
            .post(format!("{}/api/v1/auth/session", self.base_url))
            .bearer_auth(access_token)
            .send().await?;
        res.error_for_status()?.json().await
    }

    pub async fn chat(&self, session_token: &str, req: &ChatRequest) -> reqwest::Result<ChatResponse> {
        let res = self.http
            .post(format!("{}/api/v1/chatbot/chat", self.base_url))
            .bearer_auth(session_token)
            .json(req)
            .send().await?;
        res.error_for_status()?.json().await
    }

    // Stream via POST /chat/stream and parse SSE
    pub async fn chat_stream<F>(&self, session_token: &str, req: &ChatRequest, mut on_chunk: F) -> reqwest::Result<()>
    where
        F: FnMut(StreamEvent),
    {
        let res = self.http
            .post(format!("{}/api/v1/chatbot/chat/stream", self.base_url))
            .bearer_auth(session_token)
            .json(req)
            .send().await?;

        let mut stream = res.bytes_stream();
        let mut buffer = String::new();
        while let Some(chunk) = stream.next().await {
            let bytes = chunk?;
            let text = String::from_utf8_lossy(&bytes);
            buffer.push_str(&text);

            // Split on SSE event delimiter \n\n
            while let Some(idx) = buffer.find("\n\n") {
                let event = buffer[..idx].to_string();
                buffer.drain(..idx + 2);
                for line in event.lines() {
                    if let Some(data) = line.strip_prefix("data:") {
                        let json = data.trim();
                        if json != "[DONE]" && !json.is_empty() {
                            if let Ok(evt) = serde_json::from_str::<StreamEvent>(json) {
                                on_chunk(evt);
                            }
                        }
                    }
                }
            }
        }
        Ok(())
    }
}
```


## Example: Login → Session → Chat

```rust
// src/main.rs
mod models;
mod client;

use client::NexT1Client;
use models::{ChatRequest, Message};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let base = std::env::var("NEX_T1_API_BASE_URL").unwrap_or_else(|_| "http://localhost:8000".into());
    let email = std::env::var("NEX_T1_EMAIL").unwrap_or_else(|_| "user@example.com".into());
    let password = std::env::var("NEX_T1_PASSWORD").unwrap_or_else(|_| "SecurePass123!".into());

    let api = NexT1Client::new(base);

    let token = api.login(&email, &password).await?; // or api.register(...)
    let session = api.create_session(&token.access_token).await?;
    let session_token = session.token.access_token.clone();

    // Non-streaming chat
    let resp = api.chat(&session_token, &ChatRequest {
        messages: vec![Message { role: "user".into(), content: "Give me a quick BTC update.".into() }]
    }).await?;
    println!("Non-stream response: {} messages", resp.messages.len());

    // Streaming chat
    api.chat_stream(
        &session_token,
        &ChatRequest { messages: vec![Message { role: "user".into(), content: "Two-sentence market recap.".into() }] },
        |evt| {
            if let Some(content) = evt.content { print!("{}", content); }
            if matches!(evt.done, Some(true)) { println!("\n[done]"); }
        }
    ).await?;

    Ok(())
}
```

Run:

```bash
export NEX_T1_API_BASE_URL=http://localhost:8000
export NEX_T1_EMAIL=user@example.com
export NEX_T1_PASSWORD=SecurePass123!

cargo run
```


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
