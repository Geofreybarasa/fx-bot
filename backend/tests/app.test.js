const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const createApp = require('../src/app');

function get(server, path) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    http
      .get(`http://127.0.0.1:${port}${path}`, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
      })
      .on('error', reject);
  });
}

test('GET /api/v1/health returns ok', async () => {
  const server = http.createServer(createApp()).listen(0);
  try {
    const res = await get(server, '/api/v1/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
  } finally {
    server.close();
  }
});

test('GET /api/v1/markets/quotes returns demo quotes', async () => {
  const server = http.createServer(createApp()).listen(0);
  try {
    const res = await get(server, '/api/v1/markets/quotes');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
    assert.ok('symbol' in res.body.data[0]);
  } finally {
    server.close();
  }
});

test('GET /api/v1/unknown-route returns 404 via notFoundHandler', async () => {
  const server = http.createServer(createApp()).listen(0);
  try {
    const res = await get(server, '/api/v1/unknown-route');
    assert.strictEqual(res.status, 404);
  } finally {
    server.close();
  }
});
