/**
 * ticker.js
 * ------------------------------------------------------------------
 * Renders the top marquee (right → left, one direction only).
 *
 * BACKEND TEAM — READ THIS:
 * This file ships with static DEMO_QUOTES only so the page has
 * something to look at with JS disabled/before your feed connects.
 * Replace the data source, NOT the rendering functions, by doing
 * ONE of:
 *
 *   1) Call `Ticker.setQuotes(quotesArray)` any time you have fresh
 *      data (e.g. on a WebSocket message or a polling interval).
 *      Shape of quotesArray — see the `Quote` typedef below.
 *
 *   2) Point `TICKER_WS_URL` below at your real-time feed and leave
 *      `AUTOCONNECT = true`. Expected server message:
 *        { "type": "quotes", "data": Quote[] }
 *
 * Never trust this data for order execution — it is DISPLAY ONLY.
 * The actual trade/quote pipeline must be authenticated and
 * validated server-side; this marquee has no bearing on it.
 * ------------------------------------------------------------------
 * @typedef {Object} Quote
 * @property {string} symbol   e.g. "EUR/USD"
 * @property {number} price    e.g. 1.1392
 * @property {number} [changePct]  e.g. 0.42 or -0.43 (percent, signed)
 * @property {number} [decimals]   display decimals, default inferred
 */

(function () {
  'use strict';

  // ---- Config: backend team edits this block ----------------------------
  var TICKER_WS_URL = null; // e.g. "wss://api.aiscalpingbot.com/v1/ticker"
  var AUTOCONNECT = false;   // flip to true once TICKER_WS_URL is set
  var SCROLL_SECONDS = 32;   // full-loop duration; lower = faster scroll
  // -------------------------------------------------------------------

  /** @type {Quote[]} Static fallback / first-paint data. NOT LIVE. */
  var DEMO_QUOTES = [
    { symbol: 'EUR/USD', price: 1.1392, changePct: null, decimals: 4 },
    { symbol: 'GBP/USD', price: 1.3246, changePct: null, decimals: 4 },
    { symbol: 'USD/JPY', price: 157.19, changePct: null, decimals: 2 },
    { symbol: 'ETH/USD', price: 2687.75, changePct: 0.22, decimals: 2 },
    { symbol: 'BTC/USD', price: 83926.00, changePct: -0.43, decimals: 2 },
    { symbol: 'XAU/USD', price: 4286.20, changePct: 0.42, decimals: 2 }
  ];

  var track = document.getElementById('tickerTrack');
  var list = document.getElementById('tickerList');
  if (!list || !track) return;

  function formatPrice(quote) {
    var decimals = typeof quote.decimals === 'number' ? quote.decimals : 2;
    return quote.price.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function buildItem(quote) {
    var li = document.createElement('li');
    li.className = 'ticker__item';

    var symbol = document.createElement('span');
    symbol.className = 'ticker__symbol';
    symbol.textContent = quote.symbol;

    var price = document.createElement('span');
    price.className = 'ticker__price';
    price.textContent = formatPrice(quote);

    li.appendChild(symbol);
    li.appendChild(price);

    if (typeof quote.changePct === 'number') {
      var change = document.createElement('span');
      var isUp = quote.changePct >= 0;
      change.className = 'ticker__change ' + (isUp ? 'is-up' : 'is-down');
      change.textContent = (isUp ? '+' : '') + quote.changePct.toFixed(2) + '%';
      li.appendChild(change);
    }

    return li;
  }

  /**
   * Renders quotes into the marquee and duplicates the list once so the
   * CSS keyframe (translateX(-50%)) loops seamlessly, right to left.
   * @param {Quote[]} quotes
   */
  function setQuotes(quotes) {
    if (!Array.isArray(quotes) || quotes.length === 0) return;

    list.innerHTML = '';
    list.style.animationDuration = SCROLL_SECONDS + 's';

    var fragment = document.createDocumentFragment();
    quotes.forEach(function (q) { fragment.appendChild(buildItem(q)); });
    // Duplicate for seamless loop (marquee shows track then its clone)
    quotes.forEach(function (q) { fragment.appendChild(buildItem(q)); });

    list.appendChild(fragment);
  }

  function connectWebSocket(url) {
    try {
      var socket = new WebSocket(url);
      socket.addEventListener('message', function (event) {
        try {
          var payload = JSON.parse(event.data);
          if (payload && payload.type === 'quotes' && Array.isArray(payload.data)) {
            setQuotes(payload.data);
          }
        } catch (err) {
          console.error('[ticker] malformed message', err);
        }
      });
      socket.addEventListener('close', function () {
        // Basic reconnect backoff; tune/replace as needed server-side.
        setTimeout(function () { connectWebSocket(url); }, 4000);
      });
      socket.addEventListener('error', function () {
        socket.close();
      });
    } catch (err) {
      console.error('[ticker] could not open socket', err);
    }
  }

  // First paint with demo data so the marquee is never empty.
  setQuotes(DEMO_QUOTES);

  if (AUTOCONNECT && TICKER_WS_URL) {
    connectWebSocket(TICKER_WS_URL);
  }

  // Expose a tiny public API for the backend/integration layer.
  window.Ticker = { setQuotes: setQuotes };
})();
