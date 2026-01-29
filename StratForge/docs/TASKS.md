# StratForge - Team Tasks (Silo-Friendly)

Tasks that can be completed **independently** without stepping on each other's toes.

---

## 🟢 Frontend Tasks (React/Next.js)

These tasks only touch `frontend/` directory.

| Task | Difficulty | Description | Files |
|------|------------|-------------|-------|
| **Settings Page** | Easy | User profile/settings page | `app/settings/page.tsx` |
| **404 Page** | Easy | Custom not-found page | `app/not-found.tsx` |
| **Loading Skeletons** | Easy | Improve loading states | `components/*.tsx` |
| **Mobile Responsive** | Medium | Fix mobile layout issues | `components/*.tsx` |
| **Dark/Light Toggle** | Medium | Theme switcher | `context/ThemeContext.tsx` |
| **Toast Notifications** | Medium | Success/error popups | `components/Toast.tsx` |
| **Strategy List Page** | Medium | View saved strategies | `app/strategies/page.tsx` |
| **Charts (TradingView)** | Hard | Price charts on dashboard | `components/Chart.tsx` |

---

## 🔵 Backend Tasks (Gateway - Node.js)

These tasks only touch `services/gateway-node/`.

| Task | Difficulty | Description | Files |
|------|------------|-------------|-------|
| **Health Endpoint** | Easy | `GET /health` for monitoring | `routes/healthRoutes.ts` |
| **Strategy CRUD** | Medium | Create/Read/Update/Delete strategies | `routes/strategyRoutes.ts`, `controllers/` |
| **Get User Strategies** | Easy | `GET /api/strategies` | `controllers/StrategyController.ts` |
| **Password Reset** | Medium | Reset password flow | `controllers/AuthController.ts` |
| **Rate Limiting** | Medium | Prevent API abuse | `middleware/rateLimit.ts` |
| **Request Validation** | Medium | Joi/Zod schema validation | `middleware/validation.ts` |
| **Internal Execute** | Hard | `POST /internal/execute` for worker | `routes/internalRoutes.ts` |

---

## 🟣 Worker Tasks (Python)

These tasks only touch `services/worker-python/`.

| Task | Difficulty | Description | Files |
|------|------------|-------------|-------|
| **SMA Strategy** | Easy | Simple moving average strategy | `strategies/sma_strategy.py` |
| **RSI Strategy** | Easy | Relative strength index | `strategies/rsi_strategy.py` |
| **MACD Strategy** | Medium | Moving average convergence | `strategies/macd_strategy.py` |
| **Signal Logging** | Easy | Log signals to console/file | `services/strategy_manager.py` |
| **Strategy Loader** | Medium | Load strategy from DB | `services/db_client.py` |
| **Dynamic Exec** | Hard | Execute AI-generated code safely | `services/code_executor.py` |

---

## 🟠 Database/Infrastructure Tasks

| Task | Difficulty | Description | Files |
|------|------------|-------------|-------|
| **Seed Script** | Easy | Populate test data | `gateway-node/src/seed_db.ts` |
| **Migration: Add Column** | Easy | Add field to existing table | `db/migrations/` |
| **Docker Dev Setup** | Medium | Hot-reload in Docker | `docker-compose.dev.yml` |

---

## 🔴 Full-Stack Tasks (Coordinate First!)

These touch multiple areas - assign to one person or pair.

| Task | Difficulty | Description |
|------|------------|-------------|
| **Strategy Builder UI + API** | Hard | Create strategy from frontend |
| **AI Integration** | Hard | Gemini API → Strategy generation |
| **Real-time Updates** | Hard | WebSocket to frontend |
| **Trade History Page** | Medium | Frontend + new API endpoint |

---

## Suggested Team Split (4 people)

| Person | Focus Area | First Tasks |
|--------|------------|-------------|
| **Person A** | Frontend | Settings page, Toast notifications |
| **Person B** | Gateway API | Strategy CRUD, Health endpoint |
| **Person C** | Python Worker | SMA Strategy, RSI Strategy |
| **Person D** | Integration | Internal execute, Signal flow |

---

## How to Claim a Task

1. Comment "I'm working on X" in team chat
2. Create branch: `feature/task-name`
3. Complete task
4. Open PR, tag for review
5. ✅ Done!

---

## Task Dependencies

```
Strategy CRUD (Backend) ─────┐
                             ├──▶ Strategy Builder UI (Frontend)
Strategy List Page (Frontend)┘

SMA/RSI Strategies (Python) ─┬──▶ Dynamic Exec (Python)
Strategy Loader (Python) ────┘

Internal Execute (Backend) ──┬──▶ Full Signal Flow
Signal Logging (Python) ─────┘
```

Work on left side first, then right side.
