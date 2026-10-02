/**
 * services/news.service.js
 * ------------------------------------------------------------------
 * Feeds the public News page with real headlines from trusted crypto
 * and forex publishers, each linking back to the original article on
 * the publisher's own site — this file never stores or serves full
 * article text, only short attributed excerpts.
 *
 * SOURCES BELOW WERE VERIFIED LIVE BEFORE THIS WAS WRITTEN:
 *   - Cointelegraph   https://cointelegraph.com/rss                                  (official, crypto, updates hourly)
 *   - Decrypt         https://decrypt.co/feed                                        (official, crypto, updates hourly)
 *   - Bitcoin Magazine https://bitcoinmagazine.com/feed                              (official, crypto, updates hourly)
 *   - ActionForex     https://www.actionforex.com/category/action-insight/market-overview/feed/
 *     (official, FX + Gold + Silver — exactly the asset classes this site trades
 *     outside crypto. ActionForex's own RSS terms explicitly permit this: free
 *     redistribution of headlines/excerpts is allowed provided the platform
 *     links straight back to the full article, which is exactly what this page
 *     does — see https://www.actionforex.com/general/forex-rss-feeds/)
 *
 * ForexFactory is deliberately NOT pulled as a feed:
 *   - Its RSS endpoint (forexfactory.com/rss.php) returns 404 today —
 *     there is no live, working, official feed to consume.
 *   - It has no public content API, and scraping its HTML would be
 *     brittle (breaks silently whenever their markup changes) and of
 *     uncertain standing under their Terms of Service.
 * ForexFactory is instead listed via getSources() as a `linkOnly`
 * source — the News page shows a card that sends visitors straight to
 * forexfactory.com/news, with no headlines pulled or cached here. If
 * ForexFactory later offers a real feed or a data partnership, add it
 * to SOURCES the same way as the other three and remove `linkOnly`.
 *
 * Caching: each feed is fetched at most once per CACHE_TTL_MS, and a
 * fetch failure serves the last good cache instead of an empty list
 * (stale-while-error) — one flaky publisher shouldn't blank the page,
 * and it keeps request volume to these free feeds polite.
 * ------------------------------------------------------------------
 */
const Parser = require('rss-parser');
const logger = require('../utils/logger');

// rss-parser's DEFAULT User-Agent is literally the string "rss-parser",
// which Cloudflare (in front of all three publishers below) treats as an
// obvious bot and returns 403 for — even though the feeds themselves are
// public and live. A realistic, honest User-Agent (naming this project,
// not pretending to be a browser) is enough to get through. Verified
// against all three feeds while building this file.
const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'FxBotNewsAggregator/1.0 (+https://fx-bot.example)',
    Accept: 'application/rss+xml, application/xml, text/xml, */*'
  },
  // Pull in fields rss-parser doesn't map by default, so we can find an
  // image even when there's no plain <enclosure> (common on Bitcoin
  // Magazine and some Decrypt posts).
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail'],
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'dcCreator']
    ]
  }
});

const CACHE_TTL_MINUTES = 5;
const CACHE_TTL_MS = CACHE_TTL_MINUTES * 60 * 1000; // feeds themselves say they update hourly
const MAX_ITEMS = 40;
const MAX_SUMMARY_LENGTH = 220;
// "we collect and post trending news mostly within 24hrs" — only show
// headlines published in roughly the last day. Items with no parseable
// date are kept (can't prove they're stale) rather than silently dropped.
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** @typedef {{ id: string, name: string, feedUrl: string, siteUrl: string }} FeedSource */

/** @type {FeedSource[]} */
const LIVE_SOURCES = [
  { id: 'cointelegraph', name: 'Cointelegraph', feedUrl: 'https://cointelegraph.com/rss', siteUrl: 'https://cointelegraph.com' },
  { id: 'decrypt', name: 'Decrypt', feedUrl: 'https://decrypt.co/feed', siteUrl: 'https://decrypt.co' },
  { id: 'bitcoinmagazine', name: 'Bitcoin Magazine', feedUrl: 'https://bitcoinmagazine.com/feed', siteUrl: 'https://bitcoinmagazine.com' },
  { id: 'actionforex', name: 'ActionForex', feedUrl: 'https://www.actionforex.com/category/action-insight/market-overview/feed/', siteUrl: 'https://www.actionforex.com' }
];

/** Sources shown on the page that are NOT pulled as a feed — see file header. */
const LINK_ONLY_SOURCES = [
  { id: 'forexfactory', name: 'ForexFactory', siteUrl: 'https://www.forexfactory.com/news', linkOnly: true }
];

/** In-memory per-source cache: { [sourceId]: { items, fetchedAt } } */
const cache = Object.create(null);

// ---- Pure helpers (unit tested directly, no network involved) ----------

/** Strips any stray HTML and collapses whitespace. Defense in depth —
 *  the frontend must ALSO render with textContent, never innerHTML. */
function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1).trimEnd() + '\u2026';
}

/** Finds a usable article image across the different shapes these feeds use. */
function extractImage(rawItem) {
  if (rawItem.enclosure && rawItem.enclosure.url) return rawItem.enclosure.url;

  const media = rawItem.mediaContent;
  if (Array.isArray(media)) {
    const withUrl = media.find((m) => m && m.$ && m.$.url);
    if (withUrl) return withUrl.$.url;
  }
  if (rawItem.mediaThumbnail && rawItem.mediaThumbnail.$ && rawItem.mediaThumbnail.$.url) {
    return rawItem.mediaThumbnail.$.url;
  }

  // Last resort: pull the first <img src="..."> out of the full HTML body.
  const html = rawItem.contentEncoded || rawItem.content || '';
  const match = /<img[^>]+src=["']([^"'>]+)["']/i.exec(html);
  return match ? match[1] : null;
}

/** First non-generic RSS <category>, used as the small tag on each card. */
function extractCategory(rawItem, sourceName) {
  const categories = Array.isArray(rawItem.categories) ? rawItem.categories : [];
  const generic = new Set(['news', 'latest news', 'uncategorized', sourceName.toLowerCase()]);
  const pick = categories.find((c) => c && !generic.has(String(c).toLowerCase()));
  return stripHtml(pick || sourceName);
}

/** Normalizes one raw rss-parser item into the shape the frontend consumes. */
function normalizeItem(source, rawItem) {
  const publishedAt = rawItem.isoDate || (rawItem.pubDate ? new Date(rawItem.pubDate).toISOString() : null);
  const summarySource = rawItem.contentSnippet || rawItem.summary || rawItem.description || '';

  // Byline: real reporter name when the feed gives one (e.g. Cointelegraph's
  // dc:creator / rss-parser's default `creator`/`author` mapping). Some
  // feeds (ActionForex) only ever credit the publication itself — that's
  // still "a creator", just not a distinct person, so the frontend decides
  // whether it's worth showing separately from sourceName.
  const author = stripHtml(rawItem.dcCreator || rawItem.creator || rawItem.author || '') || null;

  return {
    id: `${source.id}:${rawItem.guid || rawItem.link}`,
    source: source.id,
    sourceName: source.name,
    sourceUrl: source.siteUrl,
    category: extractCategory(rawItem, source.name),
    title: stripHtml(rawItem.title || 'Untitled'),
    summary: truncate(stripHtml(summarySource), MAX_SUMMARY_LENGTH),
    author,
    url: rawItem.link,
    publishedAt,
    imageUrl: extractImage(rawItem)
  };
}

/**
 * Merges already-normalized items from multiple sources: drops anything
 * incomplete or older than MAX_AGE_MS (see its definition for the "no
 * date = keep it" reasoning), newest first, capped at `limit`.
 */
function mergeAndSort(itemLists, limit = MAX_ITEMS, now = Date.now()) {
  return itemLists
    .flat()
    .filter((item) => item.url && item.title)
    .filter((item) => !item.publishedAt || now - new Date(item.publishedAt).getTime() <= MAX_AGE_MS)
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
    .slice(0, limit);
}

// ---- I/O layer -----------------------------------------------------------

async function fetchSource(source) {
  const cached = cache[source.id];
  const isFresh = cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS;
  if (isFresh) return cached.items;

  try {
    const feed = await parser.parseURL(source.feedUrl);
    const items = (feed.items || []).map((raw) => normalizeItem(source, raw));
    cache[source.id] = { items, fetchedAt: Date.now() };
    return items;
  } catch (err) {
    logger.warn({ err: err.message, source: source.id }, 'Failed to fetch news source');
    // Stale-while-error: better to show slightly old headlines than none.
    return cached ? cached.items : [];
  }
}

async function getNews() {
  const results = await Promise.all(LIVE_SOURCES.map(fetchSource));
  return mergeAndSort(results);
}

/** Static metadata for the filter pills, including the link-only ForexFactory card. */
function getSources() {
  return [
    ...LIVE_SOURCES.map((s) => ({ id: s.id, name: s.name, siteUrl: s.siteUrl, linkOnly: false })),
    ...LINK_ONLY_SOURCES
  ];
}

module.exports = {
  getNews,
  getSources,
  CACHE_TTL_MINUTES,
  // exported for unit tests only — pure, no network:
  normalizeItem,
  mergeAndSort,
  stripHtml,
  truncate
};