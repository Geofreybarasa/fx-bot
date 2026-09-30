const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const createApp = require('../src/app');
const { partitionWebinars } = require('../src/services/webinars.service');

const NOW = new Date('2026-10-01T12:00:00Z');
const at = (iso, extra = {}) => ({
  id: extra.id || iso, title: 'T', description: 'D', host: 'H',
  startsAt: iso, durationMinutes: 60, isPublished: true, replayAvailable: false,
  joinUrl: 'https://secret.example/join', internalNotes: 'do not leak', ...extra
});

test('drafts are never returned', () => {
  const { upcoming, replays } = partitionWebinars([at('2026-10-05T10:00:00Z', { isPublished: false })], NOW);
  assert.deepStrictEqual([upcoming.length, replays.length], [0, 0]);
});

test('upcoming: future + currently-live, soonest first', () => {
  const { upcoming } = partitionWebinars([
    at('2026-10-09T10:00:00Z', { id: 'later' }),
    at('2026-10-01T11:30:00Z', { id: 'live-now' }),   // started 30m ago, lasts 60m
    at('2026-10-03T10:00:00Z', { id: 'soon' })
  ], NOW);
  assert.deepStrictEqual(upcoming.map((w) => w.id), ['live-now', 'soon', 'later']);
});

test('replays: only finished sessions WITH a recording, newest first', () => {
  const { upcoming, replays } = partitionWebinars([
    at('2026-09-01T10:00:00Z', { id: 'old', replayAvailable: true }),
    at('2026-09-20T10:00:00Z', { id: 'newer', replayAvailable: true }),
    at('2026-09-10T10:00:00Z', { id: 'no-recording', replayAvailable: false })
  ], NOW);
  assert.deepStrictEqual(replays.map((w) => w.id), ['newer', 'old']);
  assert.strictEqual(upcoming.length, 0);
});

test('public shape is an allow-list: internal fields never leak', () => {
  const { upcoming } = partitionWebinars([at('2026-10-05T10:00:00Z')], NOW);
  assert.deepStrictEqual(Object.keys(upcoming[0]).sort(),
    ['description', 'durationMinutes', 'endsAt', 'host', 'id', 'startsAt', 'title']);
  assert.ok(!JSON.stringify(upcoming).includes('secret.example'));
  assert.ok(!JSON.stringify(upcoming).includes('do not leak'));
  assert.strictEqual(upcoming[0].endsAt, '2026-10-05T11:00:00.000Z');
});

test('GET /api/v1/webinars returns empty lists today', async () => {
  const server = http.createServer(createApp()).listen(0);
  try {
    const { port } = server.address();
    const res = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/v1/webinars`, (r) => {
        let body = ''; r.on('data', (c) => (body += c));
        r.on('end', () => resolve({ status: r.statusCode, headers: r.headers, body: JSON.parse(body) }));
      }).on('error', reject);
    });
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body, { data: { upcoming: [], replays: [] } });
    assert.match(res.headers['cache-control'], /max-age=60/);
  } finally { server.close(); }
});