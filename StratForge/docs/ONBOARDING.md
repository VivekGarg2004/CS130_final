# StratForge - Team Onboarding Guide

Welcome to StratForge! This guide will get you up and running in ~30 minutes.

## Quick Start (5 min)

```bash
# 1. Start infrastructure
cd StratForge
docker compose up -d

# 2. Start backend (terminal 1)
cd services/gateway-node
npm install && npm run build && npm start

#3. Start worker (terminal 2)
cd services/worker-python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 main.py

#4. Start ingestor (terminal 3)
cd services/ingestor-node
npm install && npm run build && npm start

# 5. Start frontend (terminal 4)  
cd frontend
npm install && npm run dev -- -p 3001

# 6. Open http://localhost:3001
```

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Gateway   │────▶│   Alpaca    │
│  (Next.js)  │     │  (Express)  │     │   (Broker)  │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
                    ┌─────▼─────┐
                    │   Redis   │
                    │ (Pub/Sub) │
                    └─────┬─────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ Ingestor │   │  Worker  │   │ Postgres │
    │ (Node.js)│   │ (Python) │   │   (DB)   │
    └──────────┘   └──────────┘   └──────────┘
```

## Directory Structure

```
StratForge/
├── frontend/                 # Next.js 16 + Tailwind
│   ├── app/                  # Pages (login, dashboard, trade, orders)
│   ├── components/           # Reusable UI components
│   ├── lib/                  # Utilities (auth.ts)
│   └── context/              # React context (AuthContext)
│
├── services/
│   ├── gateway-node/         # REST API + Trade execution
│   │   ├── src/controllers/  # Request handlers
│   │   ├── src/routes/       # Route definitions
│   │   ├── src/services/     # Business logic
│   │   └── src/middleware/   # Auth middleware
│   │
│   ├── ingestor-node/        # Market data streaming
│   │   └── src/services/     # WebSocket consumers
│   │
│   └── worker-python/        # Strategy execution
│       ├── services/         # Redis listeners
│       └── strategies/       # Trading strategies
│
├── db/                       # Database migrations
├── design_docs/              # Architecture diagrams
└── docker-compose.yml        # Infrastructure

## Key Files to Read First

1. **[README.md](../README.md)** - Project overview
2. **[api_design.md](./api_design.md)** - All API endpoints documented
3. **[gateway-node/src/index.ts](../services/gateway-node/src/index.ts)** - Main server entry
4. **[frontend/app/dashboard/page.tsx](../frontend/app/dashboard/page.tsx)** - Main UI

## How Data Flows

### User Places a Trade
```
Frontend → POST /trade/orders → Gateway → Alpaca API → Order Filled
```

### Market Data Streaming
```
Alpaca WebSocket → Ingestor → Redis "market_data:AAPL" → Worker
```

### (Future) AI Strategy Execution
```
Worker receives bar → Evaluates strategy → POST /internal/execute → Trade
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Express 5, TypeScript |
| Worker | Python 3.10+, Pydantic |
| Database | PostgreSQL 15 |
| Cache/Pub-Sub | Redis 7 |
| Broker | Alpaca (Paper Trading) |

## Environment Setup

Copy `.env.example` to `.env` in gateway-node (or use existing):
```
DATABASE_URL=postgresql://stratforge:changeme@localhost:5433/stratforge
REDIS_URL=redis://localhost:6379
ALPACA_API_KEY=your_key
ALPACA_SECRET_KEY=your_secret
```

## Git Workflow

```bash
git checkout -b feature/your-feature
# Make changes
git commit -m "feat: add feature"
git push origin feature/your-feature
# Open PR
```

## Need Help?

- Check existing route patterns in `services/gateway-node/src/routes/`
- Frontend components follow same pattern in `frontend/components/`
- Ask in the team chat!
