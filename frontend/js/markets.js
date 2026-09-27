/**
 * markets.js
 * ------------------------------------------------------------------
 * Renders the Markets page (markets.html) from a catalog of
 * categories + instruments. Real data comes from:
 *   GET {API_BASE_URL}/markets/catalog
 * Response shape (see backend/src/controllers/markets.controller.js):
 *   {
 *     "data": [
 *       {
 *         "id": "crypto",
 *         "name": "Crypto",
 *         "metaLine": "8 major pairs · 24/7 execution · spread from 0.5 pip",
 *         "instruments": [
 *           { "symbol": "BTC/USD", "name": "Bitcoin", "spread": 0.5,
 *             "price": 84008.01, "changePct": 0.13, "decimals": 2 }
 *         ]
 *       }
 *     ],
 *     "updatedAt": "2026-09-26T13:40:00.000Z"
 *   }
 *
 * If API_BASE_URL isn't set yet, or the request fails, this file
 * falls back to DEMO_CATALOG below so the page is never blank during
 * frontend-only development. Never treat DEMO_CATALOG as real pricing.
 * ------------------------------------------------------------------
 */

(function () {
  'use strict';

  var CATEGORY_ICON = {
    crypto: '₿',
    gold: '$',
    fx: '⇄'
  };

  /** Fallback only — mirrors backend/src/services/marketData.service.js demo data. */
  var DEMO_CATALOG = [
    {
      id: 'crypto',
      name: 'Crypto',
      metaLine: '8 major pairs · 24/7 execution · spread from 0.5 pip',
      instruments: [
        { symbol: 'BTC/USD', name: 'Bitcoin', spread: 0.5, price: 84008.01, changePct: 0.13, decimals: 2 },
        { symbol: 'ETH/USD', name: 'Ethereum', spread: 0.6, price: 2685.94, changePct: -0.20, decimals: 2 },
        { symbol: 'SOL/USD', name: 'Solana', spread: 0.8, price: 121.15, changePct: -0.70, decimals: 2 },
        { symbol: 'XRP/USD', name: 'Ripple', spread: 0.9, price: 1.5242, changePct: -3.04, decimals: 4 },
        { symbol: 'AVAX/USD', name: 'Avalanche', spread: 1.1, price: 18.8295, changePct: 3.29, decimals: 4 },
        { symbol: 'ADA/USD', name: 'Cardano', spread: 1.0, price: 0.6123, changePct: 1.24, decimals: 4 },
        { symbol: 'DOGE/USD', name: 'Dogecoin', spread: 1.2, price: 0.1834, changePct: -1.52, decimals: 4 },
        { symbol: 'LINK/USD', name: 'Chainlink', spread: 1.0, price: 14.22, changePct: 0.85, decimals: 2 }
      ]
    },
    {
      id: 'gold',
      name: 'Gold',
      metaLine: 'Spot XAU/USD · low-spread venue routing · spread from 0.18',
      instruments: [
        { symbol: 'XAU/USD', name: 'Gold Spot', spread: 0.18, price: 4284.97, changePct: 0.42, decimals: 2 },
        { symbol: 'XAG/USD', name: 'Silver Spot', spread: 0.22, price: 64.4031, changePct: 0.71, decimals: 4 }
      ]
    },
    {
      id: 'fx',
      name: 'FX',
      metaLine: '12 majors and crosses · tight pricing · spread from 0.3 pip',
      instruments: [
        { symbol: 'EUR/USD', name: 'Euro / US Dollar', spread: 0.3, price: 1.1404, changePct: null, decimals: 4 },
        { symbol: 'GBP/USD', name: 'British Pound / US Dollar', spread: 0.3, price: 1.3246, changePct: null, decimals: 4 },
        { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', spread: 0.4, price: 157.15, changePct: null, decimals: 2 },
        { symbol: 'AUD/USD', name: 'Aussie Dollar', spread: 0.5, price: 0.7024, changePct: null, decimals: 4 },
        { symbol: 'USD/CAD', name: 'US Dollar / Canadian', spread: 0.5, price: 1.4138, changePct: null, decimals: 4 },
        { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', spread: 0.5, price: 0.8283, changePct: null, decimals: 4 },
        { symbol: 'NZD/USD', name: 'Kiwi Dollar', spread: 0.6, price: 0.5660, changePct: null, decimals: 4 },
        { symbol: 'EUR/GBP', name: 'Euro / Pound', spread: 0.6, price: 0.8594, changePct: null, decimals: 4 },
        { symbol: 'EUR/JPY', name: 'Euro / Yen', spread: 0.6, price: 179.10, changePct: null, decimals: 2 },
        { symbol: 'GBP/JPY', name: 'Pound / Yen', spread: 0.7, price: 208.15, changePct: null, decimals: 2 },
        { symbol: 'EUR/CHF', name: 'Euro / Franc', spread: 0.6, price: 0.9445, changePct: null, decimals: 4 },
        { symbol: 'AUD/JPY', name: 'Aussie / Yen', spread: 0.7, price: 110.38, changePct: null, decimals: 2 }
      ]
    }
  ];

  var catalogEl = document.querySelector('[data-market-catalog]');
  var updatedLabelEl = document.querySelector('[data-updated-label]');
  var filterPills = document.querySelectorAll('[data-filter-pills] .filter-pill');
  if (!catalogEl) return;

  var lastUpdated = null;

  function formatPrice(instrument) {
    return instrument.price.toLocaleString('en-US', {
      minimumFractionDigits: instrument.decimals,
      maximumFractionDigits: instrument.decimals
    });
  }

  function tradeHref(symbol) {
    // Logged-out visitors go through auth first, then land on this
    // instrument's trade screen. Swap the destination in ONE place
    // if that flow changes — see js/main.js ACTION_HANDLERS.
    return '/login?redirect=' + encodeURIComponent('/trade/' + symbol);
  }

  function buildInstrumentRow(instrument) {
    var row = document.createElement('a');
    row.className = 'price-row';
    row.href = tradeHref(instrument.symbol);
    row.setAttribute('data-action', 'market:open-instrument');
    row.setAttribute('data-symbol', instrument.symbol);

    var symbolCell = document.createElement('span');
    symbolCell.className = 'price-row__symbol';
    var symbolMain = document.createElement('span');
    symbolMain.className = 'price-row__symbol-main';
    symbolMain.textContent = instrument.symbol;
    var symbolMeta = document.createElement('span');
    symbolMeta.className = 'price-row__symbol-meta';
    symbolMeta.textContent = instrument.name + ' · sprd ' + instrument.spread;
    symbolCell.appendChild(symbolMain);
    symbolCell.appendChild(symbolMeta);

    var bidCell = document.createElement('span');
    bidCell.className = 'price-row__bid';
    bidCell.textContent = formatPrice(instrument);

    var changeCell = document.createElement('span');
    changeCell.className = 'price-row__change';
    if (typeof instrument.changePct === 'number') {
      var isUp = instrument.changePct >= 0;
      var changeValue = document.createElement('span');
      changeValue.className = isUp ? 'is-up' : 'is-down';
      changeValue.textContent = (isUp ? '+' : '') + instrument.changePct.toFixed(2) + '%';
      changeCell.appendChild(changeValue);
    } else {
      var dash = document.createElement('span');
      dash.className = 'price-row__dash';
      dash.textContent = '–';
      changeCell.appendChild(dash);
    }
    var arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrow.setAttribute('viewBox', '0 0 20 20');
    arrow.setAttribute('fill', 'none');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.classList.add('price-row__arrow');
    arrow.innerHTML = '<path d="M6 14 14 6M14 6H8M14 6v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>';
    changeCell.appendChild(arrow);

    row.appendChild(symbolCell);
    row.appendChild(bidCell);
    row.appendChild(changeCell);
    return row;
  }

  function buildCategorySection(category) {
    var section = document.createElement('section');
    section.className = 'market-category';
    section.id = 'category-' + category.id;

    var header = document.createElement('div');
    header.className = 'market-category__header';
    header.innerHTML =
      '<span class="market-category__icon market-category__icon--' + category.id + '" aria-hidden="true">' +
      (CATEGORY_ICON[category.id] || '•') +
      '</span>' +
      '<span><span class="market-category__name">' + category.name + '</span>' +
      '<span class="market-category__meta">' + category.metaLine + '</span></span>';

    var table = document.createElement('div');
    table.className = 'price-table';

    var tableHead = document.createElement('div');
    tableHead.className = 'price-table__head';
    tableHead.innerHTML =
      '<span>Symbol</span><span class="price-table__head-bid">Bid</span><span class="price-table__head-change">24h</span>';

    table.appendChild(tableHead);
    category.instruments.forEach(function (instrument) {
      table.appendChild(buildInstrumentRow(instrument));
    });

    section.appendChild(header);
    section.appendChild(table);
    return section;
  }

  function renderCatalog(catalog) {
    catalogEl.innerHTML = '';
    var fragment = document.createDocumentFragment();
    catalog.forEach(function (category) {
      fragment.appendChild(buildCategorySection(category));
    });
    catalogEl.appendChild(fragment);
    setUpScrollSync();
  }

  function renderError() {
    catalogEl.innerHTML = '<p class="markets-loading">Couldn\'t load live pricing. Showing demo data instead.</p>';
    renderCatalog(DEMO_CATALOG);
  }

  function updateTimestampLabel() {
    if (!updatedLabelEl || !lastUpdated) return;
    var seconds = Math.max(0, Math.round((Date.now() - lastUpdated) / 1000));
    var label = seconds < 5 ? 'updated just now' : 'updated ' + seconds + 's ago';
    updatedLabelEl.textContent = label;
  }

  function setUpScrollSync() {
    if (!('IntersectionObserver' in window) || filterPills.length === 0) return;

    var sections = Array.prototype.slice.call(document.querySelectorAll('.market-category'));
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = entry.target.id.replace('category-', '');
          filterPills.forEach(function (pill) {
            pill.classList.toggle('is-active', pill.getAttribute('data-category') === id);
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    sections.forEach(function (section) { observer.observe(section); });
  }

  async function loadCatalog() {
    var config = window.APP_CONFIG || {};

    if (!config.API_BASE_URL) {
      renderCatalog(DEMO_CATALOG);
      lastUpdated = Date.now();
      updateTimestampLabel();
      return;
    }

    try {
      var response = await fetch(config.API_BASE_URL + '/markets/catalog');
      if (!response.ok) throw new Error('Bad response: ' + response.status);
      var payload = await response.json();
      renderCatalog(payload.data);
      lastUpdated = payload.updatedAt ? new Date(payload.updatedAt).getTime() : Date.now();
    } catch (err) {
      console.error('[markets] failed to load catalog', err);
      renderError();
      lastUpdated = Date.now();
    }
    updateTimestampLabel();
  }

  loadCatalog();
  setInterval(updateTimestampLabel, 1000);

  // Smooth-scroll for the filter pills (native anchor jump is instant;
  // this upgrades it when the browser supports smooth behaviour).
  filterPills.forEach(function (pill) {
    pill.addEventListener('click', function (event) {
      var targetId = pill.getAttribute('href');
      var target = targetId && document.querySelector(targetId);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();
