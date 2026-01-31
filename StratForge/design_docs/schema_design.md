# StratForge Schema Design

## Overview

StratForge is an AI-powered paper trading platform that enables users to create, test, and execute algorithmic trading strategies. This document provides a comprehensive view of the system architecture, data models, and component interactions.

---

## Design Philosophy

### Event-Driven "Reactive-Lite" Architecture
StratForge decouples high-throughput market data from user management using Redis Pub/Sub. This "Reactive-Lite" approach allows the system to scale horizontally—handling increasing feed volumes and complex strategy evaluations without bottlenecking the user-facing API.

### Polyglot Service Specialization
w

### Virtualization Proxy Pattern
To support multi-tenancy on a single brokerage account, we implement a **Virtualization Proxy Layer**. This abstraction maintains independent "virtual portfolios" in PostgreSQL, validating trades against virtual balances before executing them on the shared real-world Alpaca account.

### Canonical Data Normalization
The **Ingestor** service acts as a translation layer, converting provider-specific payloads into a standardized internal schema (`NormalizedBar`) before they enter the Redis pipeline. This immunizes core strategy logic from upstream API changes.

---

## System Architecture

```mermaid
graph 
    subgraph "Frontend"
        UI[Next.js Dashboard<br/>:3001]
    end

    subgraph "External Services"
        Alpaca_WS[Alpaca WebSocket]
        Alpaca_REST[Alpaca REST API]
        Gemini[Gemini AI API]
    end

    subgraph "Node.js Services"
        Gateway[API Gateway<br/>:3000]
        Ingestor[Market Data Ingestor]
    end

    subgraph "Python Engine"
        Worker[Strategy Worker]
    end

    subgraph "Redis Pub/Sub"
        ControlChannel[system:subscription_updates]
        MarketChannel[market_data:symbol]
        TradeChannel[market_trades:symbol]
    end

    subgraph "Data Layer"
        Postgres[(PostgreSQL<br/>:5433)]
    end

    %% User Flow
    UI -->|REST API| Gateway
    Gateway -->|Auth, CRUD, Trade| Postgres
    Gateway -->|AI Prompts| Gemini
    Gateway -->|Order Execution| Alpaca_REST

    %% Control Flow (Session Lifecycle)
    Gateway -->|PUBLISH| ControlChannel
    ControlChannel -.->|SUBSCRIBE| Ingestor
    ControlChannel -.->|SUBSCRIBE| Worker

    %% Market Data Flow
    Alpaca_WS -->|Real-time Bars/Trades| Ingestor
    Ingestor -->|PUBLISH| MarketChannel
    Ingestor -->|PUBLISH| TradeChannel
    MarketChannel -.->|SUBSCRIBE| Worker
    TradeChannel -.->|SUBSCRIBE| Worker

    %% Strategy Execution
    Worker -->|Query Strategies| Postgres
    Worker -->|Trade Signals| Gateway

    style Gateway fill:#4a9eff,color:#fff
    style Postgres fill:#336791,color:#fff
    style ControlChannel fill:#dc382d,color:#fff
    style MarketChannel fill:#dc382d,color:#fff
    style TradeChannel fill:#dc382d,color:#fff
```

---

## Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ STRATEGIES : creates
    USERS ||--o{ SESSIONS : runs
    USERS ||--o{ TRADES : executes
    USERS ||--o{ POSITIONS : holds

    STRATEGIES ||--o{ SESSIONS : deployed_as

    SESSIONS ||--o{ SIGNALS : generates
    SESSIONS ||--o{ TRADES : logs

    SIGNALS ||--o| TRADES : triggers

    USERS {
        uuid id PK
        string email UK
        string password_hash
        string username UK
        decimal virtual_balance
        timestamp created_at
    }

    STRATEGIES {
        uuid id PK
        uuid user_id FK
        string name
        string symbol
        text python_code
        text logic_explanation
        timestamp created_at
    }

    SESSIONS {
        uuid id PK
        uuid user_id FK
        uuid strategy_id FK
        enum mode
        enum status
        timestamp started_at
        timestamp ended_at
        decimal final_pnl
    }

    SIGNALS {
        uuid id PK
        uuid session_id FK
        string symbol
        enum action
        decimal confidence
        enum status
        timestamp generated_at
    }

    TRADES {
        uuid id PK
        uuid user_id FK
        uuid session_id FK "Nullable (Manual Trades)"
        uuid signal_id FK
        string symbol
        enum action
        decimal price
        decimal quantity
        string alpaca_order_id
        timestamp executed_at
    }

    POSITIONS {
        uuid id PK
        uuid user_id FK
        string symbol
        decimal quantity
        decimal avg_entry_price
        timestamp last_updated
    }

    MARKET_DATA {
        timestamp time PK
        string symbol PK
        decimal open
        decimal high
        decimal low
        decimal close
        bigint volume
    }
```

---

## Core Tables

| Table | Purpose |
|-------|---------|
| **users** | User accounts with virtual balance |
| **strategies** | AI-generated trading strategy definitions |
| **sessions** | Strategy execution instances |
| **signals** | AI-generated trade intents |
| **trades** | Executed orders with Alpaca |
| **positions** | Virtual portfolio holdings per user |
| **market_data** | Historical OHLCV price data |

---

## Data Flows

### 1. User Creates Strategy (AI-Powered)

```
User → Gateway → Gemini AI → Strategy saved to PostgreSQL
```

### 2. Real-Time Market Data

```
Alpaca WebSocket → Ingestor → Redis (market_data:{symbol}) → Worker
```

### 3. Session Lifecycle (Control Flow)

```
User starts session → Gateway → Redis (system:subscription_updates) → Ingestor + Worker
```

### 4. Strategy Execution

```
Worker receives bar → Evaluates strategy → Signal → Gateway → Alpaca order
```

### 5. Portfolio Virtualization

```
User views portfolio → Gateway queries virtual positions → Enriches with live prices
```

> **Note**: See [virtualization_design.md](./virtualization_design.md) for detailed virtualization architecture.

---

## Service Inventory

| Service | Tech | Port | Responsibility |
|---------|------|------|----------------|
| **gateway-node** | Express + TS | 3000 | REST API, auth, trade execution |
| **ingestor-node** | Node.js + TS | — | WebSocket → Redis pipeline |
| **worker-python** | Python 3.10 | — | Strategy evaluation engine |
| **frontend** | Next.js 16 | 3001 | User dashboard |
| **Redis** | Redis 7 | 6379 | Pub/Sub messaging |
| **PostgreSQL** | PG 15 | 5433 | Persistent storage |

---

## Redis Channels

| Channel | Publisher | Subscriber | Data |
|---------|-----------|------------|------|
| `market_data:{symbol}` | Ingestor | Worker | 1-min OHLCV bars |
| `market_trades:{symbol}` | Ingestor | Worker | Tick-level trades |
| `system:subscription_updates` | Gateway | Ingestor, Worker | Session lifecycle |

---

## Related Documents

### Service Deep-Dives
| Document | Description |
|----------|-------------|
| [ingestor_design.md](./ingestor_design.md) | Market data ingestion pipeline |
| [gateway_design.md](./gateway_design.md) | REST API and trade execution |
| [worker_design.md](./worker_design.md) | Strategy execution engine |

### Other
| Document | Description |
|----------|-------------|
| [virtualization_design.md](./virtualization_design.md) | Multi-user virtual portfolio system |
| [API_Design.md](../docs/API_Design.md) | REST API endpoints and schemas |
| [ONBOARDING.md](../docs/ONBOARDING.md) | Developer quick start guide |
