# Gateway Node

The **Gateway Node** is the main API server for StratForge. It handles user authentication, strategy management, session orchestration, and trade execution.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp ../../.env.example ../../.env  # Edit with your credentials

# Run development server
npm run dev
```

## Architecture

```
gateway-node/
├── src/
│   ├── config/         # Configuration & constants
│   ├── controllers/    # Request handlers
│   ├── middleware/     # Auth middleware
│   ├── routes/         # Express routes
│   ├── services/       # Business logic
│   ├── types/          # TypeScript interfaces
│   └── index.ts        # Entry point
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new user |
| POST | `/api/auth/login` | Get JWT token |
| GET | `/api/auth/me` | Get current user |

### Strategies
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/strategies` | List user's strategies |
| POST | `/api/strategies` | Create new strategy |
| GET | `/api/strategies/:id` | Get strategy details |
| PUT | `/api/strategies/:id` | Update strategy |
| DELETE | `/api/strategies/:id` | Delete strategy |
| POST | `/api/strategies/:id/start` | Start strategy session |
| POST | `/api/strategies/:id/stop` | Stop strategy session |

### Trading
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/trade/order` | Place order |
| DELETE | `/api/trade/order/:id` | Cancel order |
| GET | `/api/trade/trades` | Get trade history |
| GET | `/api/trade/portfolio` | Get portfolio summary |
| GET | `/api/trade/positions` | Get open positions |

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sessions` | Start session |
| DELETE | `/sessions/:id` | Stop session |

## Key Services

| Service | Purpose |
|---------|---------|
| `SessionService` | Manages strategy sessions, publishes Redis events |
| `TradeExecutionService` | Consumes trade signals from Python worker |
| `VirtualizationProxy` | Executes trades via Alpaca, tracks virtual portfolio |
| `TradeReconciliationService` | Syncs pending orders with Alpaca |

## Redis Integration

The Gateway communicates with other services via Redis:

- **Publishes** to `system:subscription_updates` (Worker listens)
- **Consumes** from `trade_signals` stream (Worker produces)
- **Manages** `active_subscriptions:*` sets (Ingestor reads)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret for JWT signing |
| `ALPACA_API_KEY` | Alpaca API key |
| `ALPACA_SECRET_KEY` | Alpaca secret key |

## Development

```bash
# Type check
npm run typecheck

# Build
npm run build

# Run built version
npm start
```
