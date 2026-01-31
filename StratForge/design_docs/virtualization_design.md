# StratForge Schema Design

## Overview

StratForge operates on a **single Alpaca paper trading account** shared across all users. To provide each user with an independent trading experience, we implement a **Virtualization Proxy Layer** that:

1. Maintains per-user virtual balances and positions in PostgreSQL
2. Routes trades through the shared Alpaca account
3. Attributes order fills back to the originating user
4. Projects personalized portfolio views from virtual state

---

## Virtualization Architecture

```mermaid
flowchart 
    subgraph "User Layer"
        U1[User A]
        U2[User B]
        U3[User N...]
    end

    subgraph "Virtualization Proxy"
        VP[Virtual Portfolio Service]
        VB[(Virtual Balances<br/>PostgreSQL)]
        PT[(Positions Table<br/>PostgreSQL)]
        TH[(Trade History<br/>PostgreSQL)]
    end

    subgraph "Shared Broker"
        AL[Alpaca Account<br/>Single Paper Account]
    end

    U1 -->|Place Order| VP
    U2 -->|Place Order| VP
    U3 -->|Place Order| VP

    VP -->|1. Validate virtual balance| VB
    VP -->|2. Execute real trade| AL
    AL -->|3. Order fill| VP
    VP -->|4. Credit/debit virtual balance| VB
    VP -->|5. Update virtual positions| PT
    VP -->|6. Record trade| TH

    VP -->|Portfolio View| U1
    VP -->|Portfolio View| U2
    VP -->|Portfolio View| U3

    style VP fill:#f9f,stroke:#333
```

---

## Key Concepts

### Virtual Balance
Each user has a `virtual_balance` (default $100,000) that represents their simulated buying power. This is **completely independent** of the actual Alpaca account balance.

### Virtual Positions
Each user's positions are tracked in the `positions` table with `user_id`. When User A buys AAPL, it doesn't affect User B's AAPL position.

### Real Trades → Virtual Attribution
All trades go through the real Alpaca API (for realistic fills/slippage), but:
- The trade is recorded with `user_id` in our database
- Virtual balance is updated based on the fill
- Virtual position is updated (quantity, avg price)

---

## Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ STRATEGIES : owns
    USERS ||--o{ SESSIONS : runs
    USERS ||--o{ TRADES : executes
    USERS ||--o{ POSITIONS : holds
    
    STRATEGIES ||--o{ SESSIONS : executed_as
    
    SESSIONS ||--o{ SIGNALS : generates
    SESSIONS ||--o{ TRADES : logs
    
    SIGNALS ||--o{ TRADES : triggers

    USERS {
        UUID id PK
        VARCHAR email UK
        VARCHAR password_hash
        VARCHAR username UK
        DECIMAL virtual_balance "Default 100000"
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    STRATEGIES {
        UUID id PK
        UUID user_id FK
        VARCHAR name
        VARCHAR symbol
        TEXT python_code
        TEXT logic_explanation
        TIMESTAMP created_at
    }

    SESSIONS {
        UUID id PK
        UUID user_id FK
        UUID strategy_id FK "Nullable"
        VARCHAR mode "LIVE|PAPER|BACKTEST|MANUAL"
        VARCHAR status "RUNNING|STOPPED|FAILED|COMPLETED"
        TIMESTAMP started_at
        TIMESTAMP ended_at
        DECIMAL final_pnl
        JSONB state_metadata
    }

    SIGNALS {
        UUID id PK
        UUID session_id FK
        VARCHAR symbol
        VARCHAR action "BUY|SELL"
        DECIMAL confidence "0.0-1.0"
        TIMESTAMP generated_at
        TIMESTAMP processed_at
        VARCHAR status "PENDING|EXECUTED|REJECTED|EXPIRED"
        JSONB metadata
    }

    TRADES {
        UUID id PK
        UUID user_id FK "Virtual attribution"
        UUID session_id FK
        UUID signal_id FK "Nullable for manual"
        VARCHAR symbol
        VARCHAR action "BUY|SELL"
        DECIMAL price
        DECIMAL quantity
        VARCHAR alpaca_order_id "Real broker reference"
        TIMESTAMP executed_at
    }

    POSITIONS {
        UUID id PK
        UUID user_id FK "Virtual owner"
        UUID session_id FK "Nullable"
        VARCHAR symbol
        DECIMAL quantity
        DECIMAL average_entry_price
        TIMESTAMP last_updated
    }

    MARKET_DATA {
        TIMESTAMP time PK
        VARCHAR symbol PK
        DECIMAL open
        DECIMAL high
        DECIMAL low
        DECIMAL close
        BIGINT volume
    }
```

---

## Virtualization Proxy Flow

### Order Placement

```mermaid
sequenceDiagram
    participant User
    participant Gateway
    participant VirtualProxy
    participant Postgres
    participant Alpaca

    User->>Gateway: POST /trade/orders {symbol, qty, side}
    Gateway->>VirtualProxy: validateAndExecute(userId, order)
    
    VirtualProxy->>Postgres: SELECT virtual_balance FROM users
    
    alt Insufficient virtual balance
        VirtualProxy-->>Gateway: Error: Insufficient funds
        Gateway-->>User: 400 Bad Request
    else Balance OK
        VirtualProxy->>Alpaca: POST /orders (real trade)
        Alpaca-->>VirtualProxy: Order accepted/filled
        
        VirtualProxy->>Postgres: UPDATE users SET virtual_balance -= cost
        VirtualProxy->>Postgres: UPSERT positions (qty, avg_price)
        VirtualProxy->>Postgres: INSERT trades (user_id, details)
        
        VirtualProxy-->>Gateway: Success {order, virtual_balance}
        Gateway-->>User: 201 Created
    end
```

### Portfolio View

```mermaid
sequenceDiagram
    participant User
    participant Gateway
    participant VirtualProxy
    participant Postgres
    participant Alpaca

    User->>Gateway: GET /trade/positions
    Gateway->>VirtualProxy: getVirtualPortfolio(userId)
    
    VirtualProxy->>Postgres: SELECT * FROM positions WHERE user_id = ?
    VirtualProxy->>Alpaca: GET /positions (for real-time prices)
    
    VirtualProxy->>VirtualProxy: Merge virtual qty with real prices
    VirtualProxy-->>Gateway: Virtual positions with live prices
    Gateway-->>User: 200 OK [{symbol, qty, current_price, pnl}]
```

---

## Table Schemas

### users
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | Unique, login identifier |
| password_hash | VARCHAR(255) | Bcrypt hash |
| username | VARCHAR(50) | Display name |
| **virtual_balance** | DECIMAL | Simulated buying power (default $100,000) |
| created_at | TIMESTAMP | Account creation |
| updated_at | TIMESTAMP | Last modification |

### positions
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| **user_id** | UUID FK | Virtual owner of position |
| session_id | UUID FK | Optional session association |
| symbol | VARCHAR(10) | Ticker symbol |
| quantity | DECIMAL | Number of shares/units |
| average_entry_price | DECIMAL | Cost basis per share |
| last_updated | TIMESTAMP | Last trade update |

**Unique constraint**: `(user_id, symbol)` — one position per symbol per user

### trades
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| **user_id** | UUID FK | Virtual owner of trade |
| session_id | UUID FK | Strategy session (if automated) |
| signal_id | UUID FK | Triggering signal (if automated) |
| symbol | VARCHAR(10) | Ticker symbol |
| action | VARCHAR(4) | BUY or SELL |
| price | DECIMAL | Execution price |
| quantity | DECIMAL | Number of shares |
| **alpaca_order_id** | VARCHAR | Reference to real Alpaca order |
| executed_at | TIMESTAMP | Execution time |

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| `virtual_balance` column | ✅ Done | Migration 002 |
| `user_id` on trades | ✅ Done | Migration 002 |
| `user_id` on positions | ✅ Done | Migration 003 |
| Balance validation on order | ⚠️ Partial | Needs enforcement in TradeController |
| Virtual position update on fill | ⚠️ Partial | Logic exists but needs hardening |
| `alpaca_order_id` tracking | ❌ Missing | Add to trades table |

---

## Next Steps

1. **Add `alpaca_order_id` to trades** — Track real broker order references
2. **Enforce balance validation** — Reject orders when `virtual_balance` < order cost
3. **Position update on fill** — Atomic update of quantity and average price
4. **Portfolio endpoint** — Return virtual positions enriched with live prices
5. **P&L calculation** — `(current_price - avg_entry_price) * quantity`
