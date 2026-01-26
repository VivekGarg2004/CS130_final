 # **StratForge: AI-Powered No-Code Trading Platform**

## **Technical Design Document v1.1 \- POC Edition**

### **1\. Executive Summary**

**StratForge** is an event-driven paper trading platform designed to bridge the gap between retail accessibility and institutional-grade automation. By utilizing a "Reactive-Lite" architecture, the platform enables natural language-to-code strategy generation and execution without the overhead of traditional polling systems.

### **2\. System Architecture**

The architecture is decoupled into three primary execution environments connected via a high-speed message bus (Redis). This ensures that market data ingestion does not block the API gateway or strategy execution.

#### **2.1 High-Level Component Map**

graph TD  
    subgraph "External Ecosystem"  
        Alpaca\_WS\[Alpaca WebSocket\]  
        Alpaca\_REST\[Alpaca REST\]  
        Gemini\[Gemini 1.5 Pro\]  
    end

    subgraph "Node.js Services (Orchestration)"  
        Ingestor\[Market Data Ingestor\]  
        Gateway\[API Gateway / Order Mgr\]  
    end

    subgraph "Data Layer (Persistence & State)"  
        Redis\[(Redis: Pub/Sub \+ Cache)\]  
        Postgres\[(PostgreSQL)\]  
    end

    subgraph "Python Engine (Quantitative)"  
        Worker\[Strategy Execution Worker\]  
    end

    %% Data Flow  
    Alpaca\_WS \--\>|1-min Bars| Ingestor  
    Ingestor \--\>|Publish: market\_data:ticker| Redis  
    Redis \-.-\>|Subscribe| Worker  
    Worker \--\>|Fetch Code| Postgres  
    Worker \--\>|Post Signal| Gateway  
    Gateway \--\>|Order| Alpaca\_REST  
    Gateway \--\>|Update| User((User))

### **3\. Technical Stack**

* **Backend Orchestrator:** Node.js (TypeScript) \+ Express.  
* **Execution Worker:** Python 3.10+ (utilizing pandas-ta and redis-py).  
* **Message Broker:** Redis 7 (Pub/Sub for events, Strings for price caching).  
* **Database:** PostgreSQL 15 (JSONB for strategy state and logs).  
* **AI Engine:** Gemini 1.5 Pro (Dual-Agent System).  
* **Brokerage Integration:** Alpaca Paper Trading API.

### **4\. Data Model**

The database is designed for stateful execution, ensuring that the Python worker remains stateless and resilient.

#### **4.1 Table: strategies**

|

| **Column** | **Type** | **Description** |

| id | UUID (PK) | Unique identifier. |

| symbol | VARCHAR(10) | Ticker symbol (e.g., AAPL). |

| python\_code | TEXT | Executable script snippet. |

| logic\_explanation | TEXT | AI-generated NL summary for user. |

| is\_active | BOOLEAN | Execution toggle. |

| state\_flag | JSONB | Tracks has\_open\_position and transient variables. |

#### **4.2 Table: trades**

| **Column** | **Type** | **Description** |

| id | UUID (PK) | Unique trade record. |

| strategy\_id | UUID (FK) | Reference to trigger strategy. |

| action | VARCHAR(4) | BUY or SELL. |

| price | DECIMAL | Execution price. |

| executed\_at | TIMESTAMP | Trade timestamp. |

### **5\. API Design**

#### **5.1 External API (Frontend to Node.js)**

| **Endpoint** | **Method** | **Description** |

| /api/ai/research | POST | Agent A: Market Macro and News analysis. |

| /api/ai/generate | POST | Agent B: Generates Strategy JSON (Code \+ Explanation). |

| /api/strategies | GET/POST | Manage user-defined strategies. |

| /api/strategies/:id/toggle | PATCH | Activate or Pause strategy execution. |

| /api/portfolio | GET | Aggregated Alpaca balance and open positions. |

#### **5.2 Internal API (Python Worker to Node.js)**

| **Endpoint** | **Method** | **Description** |

| /internal/execute | POST | Receives trade signals from Python worker for validation and execution. |

### **6\. System Workflow**

#### **6.1 The Data Heartbeat (Minute-by-Minute)**

1. **Ingestion:** The Node.js Ingestor receives a 1-minute bar from Alpaca.  
2. **Broadcasting:** Ingestor pushes price/indicator data to Redis channel market\_data:SYMBOL.  
3. **Triggering:** The Python Worker, listening to Redis, wakes up.  
4. **Execution:** Worker fetches all active scripts for that symbol from Postgres and runs them via exec() in a local scope.  
5. **Signaling:** If a signal is generated, the Worker sends a payload to the Node.js /internal/execute endpoint.

#### **6.2 Agent Logic**

* **Agent A (The Analyst):** Stateless interaction. Uses Google Search/News tools to answer macro queries.  
* **Agent B (The Quant):** Stateful generation. Prompted to return a specific JSON schema containing executable Python and a plain-English explanation of the logic.

### **7\. Security & Guardrails (POC Phase)**

* **Execution Isolation:** Scripts are executed in a Python sub-process/thread with a strict 2-second timeout.  
* **Order Throttling:** The Node.js Gateway performs a "State Check" against Postgres before hitting Alpaca to prevent double-buying or erroneous signal loops.  
* **Paper Trading Only:** API keys are restricted to the Alpaca Paper environment to ensure zero financial risk during testing.

### **8\. Iterative Implementation Plan**

* **Phase 1 (Infra):** Establish Dockerized Redis and Postgres.  
* **Phase 2 (Heartbeat):** Node.js Ingestor ![][image1] Redis ![][image1] Python Listener.  
* **Phase 3 (Brain):** Gemini Agent B integration for valid JSON generation.  
* **Phase 4 (Execution):** Python Worker running exec() and signaling Node.js for Alpaca trades.  
* **Phase 5 (UI):** React dashboard for portfolio monitoring and strategy toggles.


## Requirements

- Docker
- Docker Compose

## Quick Start

1. Copy the environment example:
   ```bash
   cp .env.example .env
   ```
2. Start the infrastructure:
   ```bash
   docker compose up -d
   ```

   **Note:** PostgreSQL is exposed on host port **5433** to avoid conflicts with local system instances. Redis is on 6379.
   - Redis: localhost:6379
   - Postgres: localhost:5433 (User: stratforge, DB: stratforge)

## Structure

- `/infra`: Infrastructure configuration (Docker).
- `/services`: Application services.
  - `gateway-node`: Node.js API gateway / backend.
  - `worker-python`: Python strategy executor.
- `/db`: Database schemas and migrations.
- `/scripts`: Helper scripts.