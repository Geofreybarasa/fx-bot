/**
 * config.js
 * ------------------------------------------------------------------
 * ONE place to change when the client picks a final name, or when
 * moving between local/staging/production environments.
 *
 * Nothing else in the codebase should hardcode a brand string or an
 * API/WS URL — everything reads from window.APP_CONFIG instead.
 * This file must load BEFORE ticker.js and main.js (see index.html).
 * ------------------------------------------------------------------
 */
window.APP_CONFIG = {
  // Placeholder name for development. Client will rename before launch —
  // when they do, this is the only string literal that needs to change
  // for the brand text itself (logo mark, header, footer).
  BRAND_NAME: 'FX Bot',
  BRAND_MARK: 'FX', // short logo glyph, e.g. 2 letters
  BRAND_ESTABLISHED: 'Est. 2023',

  // Backend endpoints. Leave null in local dev if the backend isn't
  // up yet — the frontend degrades gracefully (ticker shows demo data,
  // "Sign in" just follows its href).
  API_BASE_URL: 'http://localhost:3000/api/v1' ,       // e.g. 'https://api.fx-bot.example/api/v1'
  TICKER_WS_URL: null,       // e.g. 'wss://api.fx-bot.example/v1/ticker'
  TICKER_AUTOCONNECT: false  // flip to true once TICKER_WS_URL is set
};
