# Integration guide

Everything the backend/app team needs to connect real functionality,
without touching the design markup unless noted.

## 1. Live ticker (marquee)

File: `js/ticker.js`

Two ways to feed it, pick one:

**A — push data from anywhere on the page**
```js
window.Ticker.setQuotes([
  { symbol: 'BTC/USD', price: 83926.00, changePct: -0.43, decimals: 2 },
  { symbol: 'XAU/USD', price: 4286.20,  changePct:  0.42, decimals: 2 }
  // ...
]);
```
Call this on an interval, on a WebSocket message, or after any fetch.

**B — let ticker.js manage its own WebSocket**
Set these two constants near the top of `js/ticker.js`:
```js
var TICKER_WS_URL = 'wss://api.aiscalpingbot.com/v1/ticker';
var AUTOCONNECT = true;
```
Expected server → client message shape:
```json
{ "type": "quotes", "data": [
  { "symbol": "EUR/USD", "price": 1.1392, "changePct": null, "decimals": 4 }
]}
```
`changePct` is optional (omit or send `null` to hide the up/down badge).
The socket auto-reconnects with a fixed 4s backoff — replace with your
own strategy if you need exponential backoff/jitter.

**Do not** use this channel for anything other than display prices. It's
unauthenticated and client-facing; never send account-specific data,
balances, or tradeable order books over it.

## 2. Navigation / routing

Every interactive element has both:
- a real `href` (`/markets`, `/trade`, `/account/new`, `/login`, …)
- a `data-action="..."` attribute (e.g. `nav:markets`, `account:open`, `auth:sign-in`)

If you're introducing a client-side router (SPA) or a server-rendered
app, you have two options:
- Keep the `href`s and let normal navigation happen (simplest, works
  today with zero JS changes), or
- Intercept in `js/main.js` inside `ACTION_HANDLERS` — one object, one
  place to add `event.preventDefault()` + your router call per action.

Full list of `data-action` values used on this page:

| data-action              | Element                          | Suggested destination        |
|---------------------------|-----------------------------------|-------------------------------|
| `auth:sign-in`             | Header "Sign in" button           | Login page/modal              |
| `account:open`             | "Open an Account" CTA             | Onboarding/KYC flow           |
| `nav:how-it-works`         | "How the bot works" CTA           | `/how-it-works`               |
| `nav:promotions`           | Quick action                      | `/promotions`                 |
| `nav:news`                 | Quick action                      | `/news`                       |
| `nav:economic-calendar`    | Quick action                      | `/economic-calendar`          |
| `nav:webinar`              | Quick action                      | `/webinars`                   |
| `nav:markets`              | "Markets we trade" chevron + tab  | `/markets`                    |
| `nav:market`               | Individual market card            | `/markets#crypto` etc.        |
| `nav:feedback`             | "Send your feedback"              | `/feedback`                   |
| `nav:risk-disclosure`      | Risk disclosure links             | `/risk-disclosure`            |
| `nav:privacy` / `nav:terms`/ `nav:about` | Footer links        | Respective legal pages        |
| `nav:home` / `nav:trade` / `nav:earn` / `nav:funds` | Bottom nav | Respective app sections |

A `landing:action` custom event also fires on every click, for
analytics, without needing to edit `main.js`:
```js
document.addEventListener('landing:action', (e) => {
  analytics.track(e.detail.action, { href: e.detail.href });
});
```

## 3. Auth state (signed in vs signed out)

This page assumes a **signed-out** visitor. Once the login/session
system exists, the natural extension points are:
- Swap the header "Sign in" button for an account menu when a valid
  session exists (do this server-side/at render time if you're
  server-rendering, to avoid a signed-out flash).
- The bottom app nav (`Home / Markets / Trade / Earn / Funds`) is
  shared chrome — reuse it as-is in the authenticated app shell for
  visual continuity, wiring real routes behind each tab.

## 4. Content that needs real data before launch

- `data-market="crypto|gold|fx"` cards: spreads/pair counts are
  hardcoded from the design (`data-spread`, `data-count`/`data-pair`
  attributes are there for you to re-render from an API without
  restructuring markup).
- Customer review cards (`data-review-id="sample-N"`): placeholders,
  see main README — replace with real, sourced reviews or a CMS feed.

## 5. Images

`assets/img/hero-robot.png` is the only binary asset. Recommend the
backend/infra team put this behind a CDN and serve a couple of
responsive sizes (`srcset`) once real production art is finalized —
current file is not yet optimized/compressed for production.
