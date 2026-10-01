const test = require('node:test');
const assert = require('node:assert');
const { normalizeItem, mergeAndSort, stripHtml, truncate } = require('../src/services/news.service');

const SOURCE = { id: 'cointelegraph', name: 'Cointelegraph', siteUrl: 'https://cointelegraph.com' };

test('stripHtml removes tags and collapses whitespace', () => {
  assert.strictEqual(stripHtml('<p>Hello   <b>world</b></p>\n'), 'Hello world');
  assert.strictEqual(stripHtml(null), '');
});

test('truncate adds an ellipsis only when needed', () => {
  assert.strictEqual(truncate('short', 20), 'short');
  assert.strictEqual(truncate('a'.repeat(30), 10), 'a'.repeat(9) + '\u2026');
});

test('normalizeItem maps rss-parser fields to the public shape', () => {
  const raw = {
    guid: 'https://cointelegraph.com/news/abc',
    title: 'Bitcoin <script>alert(1)</script> rises',
    contentSnippet: 'Bitcoin rose today after ' + 'x'.repeat(300),
    link: 'https://cointelegraph.com/news/abc?utm_source=rss',
    isoDate: '2026-09-30T02:25:00.000Z',
    enclosure: { url: 'https://example.com/pic.png' }
  };
  const item = normalizeItem(SOURCE, raw);

  assert.strictEqual(item.id, 'cointelegraph:https://cointelegraph.com/news/abc');
  assert.strictEqual(item.source, 'cointelegraph');
  assert.strictEqual(item.sourceName, 'Cointelegraph');
  assert.ok(!item.title.includes('<script>'), 'title must not contain raw HTML');
  assert.ok(item.summary.length <= 220);
  assert.strictEqual(item.url, raw.link);
  assert.strictEqual(item.publishedAt, '2026-09-30T02:25:00.000Z');
  assert.strictEqual(item.imageUrl, 'https://example.com/pic.png');
});

test('normalizeItem falls back gracefully when fields are missing', () => {
  const item = normalizeItem(SOURCE, { link: 'https://cointelegraph.com/x', pubDate: 'Tue, 29 Sep 2026 10:00:00 +0000' });
  assert.strictEqual(item.title, 'Untitled');
  assert.strictEqual(item.imageUrl, null);
  assert.strictEqual(item.category, 'Cointelegraph');
  assert.strictEqual(item.publishedAt, new Date('Tue, 29 Sep 2026 10:00:00 +0000').toISOString());
});

test('normalizeItem picks a real category over a generic one', () => {
  const item = normalizeItem(SOURCE, { link: 'https://cointelegraph.com/y', categories: ['Latest News', 'Bitcoin'] });
  assert.strictEqual(item.category, 'Bitcoin');
});

test('normalizeItem finds an image from media:content when there is no enclosure', () => {
  const item = normalizeItem(SOURCE, {
    link: 'https://cointelegraph.com/z',
    mediaContent: [{ $: { url: 'https://example.com/media.jpg', medium: 'image' } }]
  });
  assert.strictEqual(item.imageUrl, 'https://example.com/media.jpg');
});

test('normalizeItem falls back to the first <img> in content:encoded', () => {
  const item = normalizeItem(SOURCE, {
    link: 'https://cointelegraph.com/w',
    contentEncoded: '<p>intro</p><img src="https://example.com/body.png" alt="">'
  });
  assert.strictEqual(item.imageUrl, 'https://example.com/body.png');
});

test('mergeAndSort orders newest-first across sources and drops incomplete items', () => {
  const a = [{ title: 'Old', url: 'https://a.example/1', publishedAt: '2026-09-01T00:00:00Z' }];
  const b = [
    { title: 'New', url: 'https://b.example/1', publishedAt: '2026-09-29T00:00:00Z' },
    { title: 'No URL', url: null, publishedAt: '2026-09-30T00:00:00Z' } // must be dropped
  ];
  const merged = mergeAndSort([a, b]);
  assert.deepStrictEqual(merged.map((i) => i.title), ['New', 'Old']);
});

test('mergeAndSort respects the limit', () => {
  const many = Array.from({ length: 40 }, (_, i) => ({
    title: `Item ${i}`, url: `https://a.example/${i}`, publishedAt: new Date(2026, 0, i + 1).toISOString()
  }));
  assert.strictEqual(mergeAndSort([many], 10).length, 10);
});