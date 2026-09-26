# fx-bot

> **Naming note:** "fx-bot" is a working development name for the repo
> and folder only. The client hasn't picked a final product name yet.
> When they do:
> - the **frontend** rename is one file — `frontend/js/config.js`
>   (`BRAND_NAME`, `BRAND_MARK`) — nothing else references a brand string.
> - the **backend** has no brand references at all.
> - the repo/folder name itself (`fx-bot`) can be renamed anytime with a
>   plain `git mv` / rename, since nothing inside hardcodes it.

Monorepo containing both halves of the trading platform:

```
fx-bot/
├── frontend/     ← static landing page (plain HTML/CSS/JS, no build step)
│   └── docs/      ← README.md, INTEGRATION.md, SECURITY.md
├── backend/      ← Node/Express API + WebSocket server
│   └── README.md
├── infra/        ← deploy/ops config (docker-compose, reverse proxy, etc.)
└── package.json   ← npm workspaces root
```

## Where to start

- **Frontend-only work** (styling, new sections, copy): everything you
  need is in `frontend/`, see `frontend/docs/README.md`. No Node
  install required — it's plain static files.
- **Backend work** (auth, trading logic, data): see `backend/README.md`.
- **Connecting the two**: see `frontend/docs/INTEGRATION.md` for the
  exact contract (ticker message shape, route table, data-action list)
  and `backend/README.md`'s "Connecting the frontend to this backend"
  section for the local dev setup.

## Quick start (both sides, local dev)

```bash
# Backend
cd backend && cp .env.example .env && npm install && npm run dev
# → http://localhost:4000

# Frontend (separate terminal)
cd frontend && npx serve .
# → http://localhost:3000 (or whatever port `serve` prints)
```

Then point `frontend/js/config.js` at the local backend (see
`backend/README.md`) to move off demo data.

## Current status

- ✅ Landing page — complete, responsive, accessible, framework-free.
- ✅ Backend skeleton — Express + WebSocket, config/logging/error-handling/
  auth middleware in place, ticker endpoint working end-to-end with demo data.
- ⏳ Real auth (DB-backed) — stubbed, see `backend/src/services/auth.service.js`.
- ⏳ Real market data provider — stubbed, see `backend/src/services/marketData.service.js`.
- ⏳ Account/trade/earn/funds pages (the logged-in app) — not started.
