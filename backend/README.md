# fx-bot — Backend

Node/Express API + WebSocket server. "fx-bot" is a working development
name; see `../frontend/js/config.js` for the one place brand text is
defined on the frontend side. This backend doesn't hardcode a brand
name anywhere, so there's nothing to rename here later.

## Structure

```
backend/
├── src/
│   ├── app.js              ← Express app: middleware + route mounting (no listen())
│   ├── server.js            ← boots app.js, attaches the ticker WebSocket, listens
│   ├── config/
│   │   └── index.js          ← reads/validates .env once, exports one frozen config object
│   ├── routes/                ← thin: URL → controller mapping + per-route middleware
│   ├── controllers/            ← thin: request in, response out, no business logic
│   ├── services/                ← business logic lives here (auth, market data, later: risk, trades)
│   ├── middleware/
│   │   ├── auth.js               ← requireAuth / attachUserIfPresent (JWT verification)
│   │   ├── rateLimit.js            ← standard + strict presets
│   │   ├── validate.js              ← zod-schema request validation
│   │   └── errorHandler.js           ← AppError class + centralized error responses
│   ├── sockets/
│   │   └── ticker.socket.js          ← WebSocket feeding the frontend marquee
│   ├── models/                        ← (empty) DB schemas/queries go here once a DB is chosen
│   ├── jobs/                           ← (empty) cron/background workers go here
│   └── utils/
│       └── logger.js                    ← shared pino logger
├── tests/
│   └── app.test.js                        ← smoke tests using Node's built-in test runner
├── .env.example
└── package.json
```

## Getting started

```bash
cd backend
cp .env.example .env
npm install
npm run dev        # nodemon, restarts on file change
```

Server starts on `http://localhost:4000` by default (`PORT` in `.env`).
The ticker WebSocket is on the same server at `ws://localhost:4000/v1/ticker`.

Run tests:
```bash
npm test
```

## What's actually implemented right now

- `GET /api/v1/health` — liveness check.
- `GET /api/v1/markets/quotes` — one-shot quote snapshot (demo data).
- `GET /api/v1/markets` — the "Markets we trade" card data (demo data).
- `ws://.../v1/ticker` — pushes `{ type: 'quotes', data: [...] }` on an
  interval to every connected client. Points directly at
  `services/marketData.service.js` — replace the demo data there and
  both the REST endpoint and the socket update automatically.
- `POST /api/v1/auth/sign-in` — wired end-to-end, but
  `services/auth.service.js` returns a `501` until `DATABASE_URL` is
  set and the real user lookup is implemented (see TODOs in that file).
- `GET /api/v1/account/me` — behind `requireAuth`, returns `501` until
  the account service exists.

## Connecting the frontend to this backend

1. `npm run dev` here.
2. In `frontend/js/config.js`, set:
   ```js
   API_BASE_URL: 'http://localhost:4000/api/v1',
   TICKER_WS_URL: 'ws://localhost:4000/v1/ticker',
   TICKER_AUTOCONNECT: true
   ```
3. Serve the frontend (`npx serve frontend`) and open it — the marquee
   should switch from demo data to whatever `marketData.service.js`
   returns (still demo data until you wire up a real provider, but now
   flowing over the actual socket).

## Before this goes anywhere near production

- Replace `services/auth.service.js` and `services/marketData.service.js`
  demo logic with real implementations.
- Pick a database, add a connection pool + migrations, fill in `models/`.
- Add `models/` + a real user table, password hashing (bcrypt/argon2).
- Tighten `helmet()`'s CSP in `app.js` to your real frontend origin(s).
- Add structured audit logging on every money-movement route once they exist.
- Consider moving `JWT_SECRET` and provider API keys to a real secrets
  manager rather than a plain `.env` file in production.
