/**
 * news.js
 * ------------------------------------------------------------------
 * Renders the News page from:
 *   GET {API_BASE_URL}/news
 * Response: { data: NewsItem[], sources: Source[], updatedAt, refreshIntervalMinutes }
 *   NewsItem = { id, source, sourceName, sourceUrl, category, title, summary, url, publishedAt, imageUrl }
 *
 * Every card links to the article's own `url` on the publisher's site
 * (target="_blank", rel="noopener noreferrer") — this page never shows
 * full article bodies, only the short `summary` the feed itself provides.
 *
 * Safety: all feed text is written with textContent, never innerHTML, so
 * a hostile title/summary from a feed can't inject markup. `imageUrl` is
 * only ever used as an <img src> after safeImageUrl() (https only).
 * The only innerHTML use is for static, hardcoded SVG icon strings.
 *
 * No backend yet, or the request fails: falls back to DEMO_ITEMS below
 * so the page is never blank during frontend-only development. Never
 * treat DEMO_ITEMS as real news.
 * ------------------------------------------------------------------
 */
(function () {
  'use strict';

  var content = document.querySelector('[data-news-content]');
  var updatedLabelEl = document.querySelector('[data-updated-label]');
  var refreshMinutesEl = document.querySelector('[data-refresh-minutes]');
  if (!content) return;

  var lastUpdated = null;
  var items = [];
  var relativeFormat = null;
  try { relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }); } catch (err) { /* very old browser */ }

  var DEMO_ITEMS = [
    {
      id: 'demo:1', source: 'cointelegraph', sourceName: 'Cointelegraph', sourceUrl: 'https://cointelegraph.com',
      category: 'Bitcoin', title: "Here's what happened in crypto today",
      summary: "Need to know what happened in crypto today? Here is the latest news on daily trends and events impacting Bitcoin price, blockchain, DeFi, Web3 and NFTs.",
      author: 'Helen Partz',
      url: 'https://cointelegraph.com', publishedAt: new Date(Date.now() - 19 * 3600000).toISOString(),
      imageUrl: null
    },
    {
      id: 'demo:2', source: 'actionforex', sourceName: 'ActionForex', sourceUrl: 'https://www.actionforex.com',
      category: 'Gold', title: 'Gold breaks key resistance as Dollar Index holds support',
      summary: 'Gold pushes through its recent range high even as the Dollar Index steadies, with the Fed\u2019s next rate signal likely to decide which side breaks.',
      author: 'ActionForex',
      url: 'https://www.actionforex.com', publishedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      imageUrl: null
    },
    {
      id: 'demo:3', source: 'decrypt', sourceName: 'Decrypt', sourceUrl: 'https://decrypt.co',
      category: 'Markets', title: 'Ether holds steady as traders eye the next move',
      summary: 'Analysts point to key support levels as ETH consolidates after a volatile week of trading.',
      author: null,
      url: 'https://decrypt.co', publishedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
      imageUrl: null
    }
  ];

  var FALLBACK_SOURCES = [{ id: 'forexfactory', name: 'ForexFactory', siteUrl: 'https://www.forexfactory.com/news', linkOnly: true }];

  var PLACEHOLDER_SVG = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="1.8" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="10" r="1.6" stroke="currentColor" stroke-width="1.5"/><path d="m5 17 4.5-4.5L12 15l3-3.5 4 4.5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function formatRelative(iso) {
    if (!iso) return '';
    var diffMs = Date.now() - new Date(iso).getTime();
    var minutes = Math.round(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (!relativeFormat) return minutes + 'm ago';
    if (minutes < 60) return relativeFormat.format(-minutes, 'minute');
    var hours = Math.round(minutes / 60);
    if (hours < 24) return relativeFormat.format(-hours, 'hour');
    return relativeFormat.format(-Math.round(hours / 24), 'day');
  }

  function hostnameOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (err) { return ''; }
  }

  /* ---------- Images (loaded strictly from the publisher's own site) ---------- */

  // Accept only absolute https URLs. Upgrades http (avoids mixed-content
  // blocking), resolves relative paths against the publisher's site, and
  // rejects javascript:, data: and anything else.
  function safeImageUrl(raw, base) {
    if (!raw || typeof raw !== 'string') return null;
    try {
      var u = new URL(raw.trim(), base || undefined);
      if (u.protocol === 'http:') u.protocol = 'https:';
      return u.protocol === 'https:' ? u.href : null;
    } catch (err) { return null; }
  }

  function setFallback(wrap) {
    wrap.textContent = '';
    wrap.classList.add('news-card__media--fallback');
    wrap.innerHTML = PLACEHOLDER_SVG; // static string, no feed data
  }

  function buildImage(item) {
    var wrap = el('div', 'news-card__media');
    var src = safeImageUrl(item.imageUrl, item.sourceUrl);
    if (!src) { setFallback(wrap); return wrap; }

    var img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';

    // First attempt uses the browser's default referrer (some CDNs, like
    // Cointelegraph's, reject requests with no Referer). If that fails,
    // retry ONCE with no referrer (other CDNs reject unknown referers).
    // Only then fall back to the placeholder icon.
    var retried = false;
    img.addEventListener('error', function () {
      if (!retried) {
        retried = true;
        img.referrerPolicy = 'no-referrer';
        img.src = src;
        return;
      }
      setFallback(wrap);
    });

    img.src = src;
    wrap.appendChild(img);
    return wrap;
  }

  /* ---------- Cards ---------- */

  function buildCard(item) {
    var card = el('a', 'news-card');
    card.href = item.url;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.setAttribute('data-action', 'news:open');
    card.setAttribute('data-article-id', item.id);
    card.setAttribute('data-published-at', item.publishedAt || '');

    card.appendChild(buildImage(item));

    var body = el('div', 'news-card__body');
    var meta = el('div', 'news-card__meta');
    meta.appendChild(el('span', 'news-card__category', item.category || item.sourceName));
    body.appendChild(meta);

    body.appendChild(el('h2', 'news-card__title', item.title));
    if (item.summary) body.appendChild(el('p', 'news-card__summary', item.summary));

    // Byline row: a real reporter's name when the feed gives one (e.g.
    // "Helen Partz"), otherwise the publication itself — either way,
    // paired with the relative time, matching the reference design.
    var sourceName = item.sourceName || hostnameOf(item.url);
    var byline = item.author && item.author.toLowerCase() !== sourceName.toLowerCase() ? item.author : sourceName;
    var authorRow = el('p', 'news-card__author');
    authorRow.appendChild(el('span', 'news-card__author-name', byline));
    authorRow.appendChild(document.createTextNode(' '));
    authorRow.appendChild(el('time', 'news-card__time', formatRelative(item.publishedAt)));
    body.appendChild(authorRow);

    // Only add a separate "via {source}" line when the byline above was a
    // real person — otherwise it would just repeat the same name twice.
    if (byline !== sourceName) {
      var source = el('span', 'news-card__source');
      source.innerHTML = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M6 14 14 6M14 6H8M14 6v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      source.appendChild(document.createTextNode('via ' + sourceName));
      body.appendChild(source);
    }

    card.appendChild(body);
    return card;
  }

  function buildLinkOnlyCard(source) {
    var card = el('a', 'news-card news-card--link-only');
    card.href = source.siteUrl;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.setAttribute('data-action', 'news:open-external-source');

    var body = el('div', 'news-card__body');
    var icon = el('span', 'news-card__icon');
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 14 14 6M14 6H8M14 6v6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    body.appendChild(icon);

    var text = el('span');
    text.appendChild(el('span', 'news-card__title', 'More on ' + source.name));
    text.appendChild(el('p', 'news-card__summary', 'Breaking forex news and economic events, straight from ' + source.name + '.'));
    body.appendChild(text);

    card.appendChild(body);
    return card;
  }

  function render(newsItems, sources) {
    content.textContent = '';
    items = newsItems;

    var list = el('div', 'news-list');
    newsItems.forEach(function (item) { list.appendChild(buildCard(item)); });

    (sources || FALLBACK_SOURCES).filter(function (s) { return s.linkOnly; }).forEach(function (source) {
      list.appendChild(buildLinkOnlyCard(source));
    });

    content.appendChild(list);
  }

  function tickTimestamps() {
    if (updatedLabelEl && lastUpdated) {
      var seconds = Math.max(0, Math.round((Date.now() - lastUpdated) / 1000));
      updatedLabelEl.textContent = seconds < 5 ? 'updated just now' : 'updated ' + seconds + 's ago';
    }
    content.querySelectorAll('.news-card__time').forEach(function (timeEl, index) {
      var item = items[index];
      if (item) timeEl.textContent = formatRelative(item.publishedAt);
    });
  }

  async function load() {
    var config = window.APP_CONFIG || {};

    if (!config.API_BASE_URL) {
      render(DEMO_ITEMS, FALLBACK_SOURCES);
      lastUpdated = Date.now();
      tickTimestamps();
      return;
    }

    try {
      var response = await fetch(config.API_BASE_URL + '/news');
      if (!response.ok) throw new Error('Bad response: ' + response.status);
      var payload = await response.json();
      var newsItems = Array.isArray(payload.data) ? payload.data : [];
      if (refreshMinutesEl && payload.refreshIntervalMinutes) refreshMinutesEl.textContent = payload.refreshIntervalMinutes;

      if (!newsItems.length) {
        render(DEMO_ITEMS, payload.sources); // live sources all failed/empty: still show something useful
      } else {
        render(newsItems, payload.sources);
      }
      lastUpdated = payload.updatedAt ? new Date(payload.updatedAt).getTime() : Date.now();
    } catch (err) {
      console.error('[news] failed to load headlines', err);
      render(DEMO_ITEMS, FALLBACK_SOURCES);
      lastUpdated = Date.now();
    }
    tickTimestamps();
  }

  load();
  setInterval(tickTimestamps, 1000);
})();