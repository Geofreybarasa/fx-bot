# FX Bot — Frontend (Landing Page)

> **Naming note:** "FX Bot" is a working development name only. The client
> will pick a final brand later. When they do, the rename touches exactly
> **one file**: `js/config.js` (`BRAND_NAME`, `BRAND_MARK`). Nothing else
> in this codebase should ever hardcode the brand string — see
> "Branding & config" below.

Static, framework-free landing page: plain HTML/CSS/JS, no build step
required. This is **page 1 of the product** (the logged-out
marketing/landing page). The logged-in app (dashboard, trade, earn,
funds) is a separate deliverable being built next.

This folder is `frontend/` inside the main `fx-bot/` monorepo, sitting
next to `backend/`. See the root `README.md` for the overall project
layout and how the two sides connect.

## Folder structure

```
frontend/
├── index.html            ← the page itself
├── css/
│   └── styles.css        ← all styling, design tokens at the top (:root)
├── js/
│   ├── config.js          ← ⭐ single source of truth: brand text + API/WS URLs
│   ├── ticker.js           ← top marquee, see "Live ticker" below
│   └── main.js              ← click delegation, routing hooks, applies branding
├── assets/
│   └── img/
│       └── hero-robot.png ← hero image (replace/optimize as needed)
└── docs/
    ├── README.md          ← this file
    ├── INTEGRATION.md     ← exact hooks the backend/app team needs
    └── SECURITY.md         ← security notes for this static page
```

## Running it locally

No build tooling needed. Any static file server works, e.g.:

```bash
npx serve frontend
# or
python3 -m http.server --directory frontend 8080
```

Open the printed localhost URL. Resize the browser / use dev-tools device
mode to check mobile, tablet, folded-phone (~280px) and desktop widths —
breakpoints are in `css/styles.css` under the "Responsive" comments.

## Branding & config

`js/config.js` is loaded before every other script and exposes
`window.APP_CONFIG`:

```js
window.APP_CONFIG = {
  BRAND_NAME: 'FX Bot',
  BRAND_MARK: 'FX',
  BRAND_ESTABLISHED: 'Est. 2023',
  API_BASE_URL: null,
  TICKER_WS_URL: null,
  TICKER_AUTOCONNECT: false
};
```

- `main.js` reads `BRAND_NAME` / `BRAND_MARK` / `BRAND_ESTABLISHED` and
  writes them into every element tagged `data-brand-name`,
  `data-brand-mark`, or `data-brand-est` (header logo, footer, page
  title). **Renaming the product = editing these three values once.**
- `ticker.js` reads `TICKER_WS_URL` / `TICKER_AUTOCONNECT` instead of
  hardcoding them, so switching environments (local → staging → prod)
  is also a `config.js` edit, not a code change.
- For multiple environments, the simplest approach is to keep
  environment-specific copies of `config.js` (`config.local.js`,
  `config.prod.js`) and have your deploy step copy the right one to
  `js/config.js`, or serve it dynamically from the backend. Either way,
  the rest of the codebase doesn't need to know which environment it's in.

## What's already done

- Full markup for the landing page: header + sign-in, live-price
  marquee, hero, quick actions, markets we trade, customer reviews,
  performance & risk, security & infrastructure, footer, and a
  persistent bottom app nav.
- Fully responsive: small/folded phones → tablet → desktop.
- Accessible by default: skip link, semantic landmarks, visible focus
  states, `prefers-reduced-motion` respected, alt text / aria-labels on
  icon-only controls.
- Every clickable element that should eventually go somewhere has:
  - a real `href` (so it still "works" as a link before routes exist), and
  - a `data-action="..."` attribute your router/analytics can hook into.
- The price marquee is wired to accept live data with **zero markup
  changes** — see `docs/INTEGRATION.md`.

## What is intentionally NOT done here (by design)

This page ships with **no authentication, no real market data, no
storage, and no API calls**. That's deliberate: this is presentation
only. All of the following belong in `backend/`, not here:

- Sign-in / account creation / KYC
- Real quotes, spreads, trade execution
- Any persistence of user data (this static page uses none — no
  cookies, no localStorage, no sessionStorage)
- Payment/subscription handling — implement actual billing server-side
  with proper reconciliation and audit logging

See `docs/SECURITY.md` for why this separation matters for a product
handling digital assets, and `docs/INTEGRATION.md` for exactly where to
plug in.

## Placeholder content — replace before production

- **Customer reviews** (`index.html`, `data-review-id="sample-N"`): these
  are sample placeholders in the reference design, not verified reviews.
  Do not ship fabricated or unverifiable testimonials — replace with real,
  attributable reviews (or remove the section) before this goes live.
- **Ticker prices**: static demo values in `js/ticker.js`, clearly marked
  `DEMO_QUOTES`. Never let demo data reach production silently — the
  marquee has a `Connecting to live prices…` fallback state on purpose.
