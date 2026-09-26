# Security notes

This page is static and holds no secrets, auth, or user data — but a
digital-asset trading platform's *first* page is still part of its
attack surface (it's what gets phished/cloned, and it's the first
thing a scanner or auditor sees), so a few things are worth doing
properly even at this layer.

## What this page does NOT do (on purpose)

- No cookies, no `localStorage`/`sessionStorage`, no client-side
  storage of any kind.
- No inline `<script>` with user data, no `eval`, no dynamically
  constructed HTML from untrusted input.
- No third-party trackers/scripts bundled by default — if you add
  analytics, self-host or pin exact versions and add them to the CSP
  below rather than loading arbitrary third-party JS.
- No form posts anywhere on this page (sign-in/account creation are
  out-of-page navigations by design, so credentials never transit
  through this static bundle).

## Recommended for the server/CDN serving this page

- **HTTPS only**, HSTS with `includeSubDomains; preload`.
- **Content-Security-Policy**, roughly:
  ```
  default-src 'self';
  img-src 'self' data:;
  style-src 'self' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com;
  script-src 'self';
  connect-src 'self' wss://api.aiscalpingbot.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  ```
  Adjust `connect-src`/`script-src` to match your real ticker/API
  hosts. No `unsafe-inline` / `unsafe-eval` should ever be needed for
  this page as written.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (or rely
  on `frame-ancestors` above), `Referrer-Policy: strict-origin-when-cross-origin`.
- Subresource integrity (`integrity="sha384-..."`) if you ever load
  the Google Fonts stylesheet or any script from a CDN instead of
  self-hosting.

## For the team building what's behind these buttons

Since this is explicitly a platform for trading digital assets, the
usual landing page hand-off note is worth repeating here: the pages
this links to (account creation, deposits/withdrawals, KYC) are where
real risk lives, and should get the corresponding rigor —
strong auth (MFA), server-side validation of every trade/withdrawal
request, signed and audited money movement, rate limiting, and a
clear, honest presentation of risk and any regulatory status/licensing
your jurisdiction requires for the product. None of that is
implemented here; it all belongs server-side, and it's worth treating
as launch-blocking rather than backfilled later.

## Reporting

If a security issue is found in this bundle, treat it like any other
finding in the codebase — file it in your normal tracker; this static
page doesn't need a special-cased process since it has no backend of
its own.
