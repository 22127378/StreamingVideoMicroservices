const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { app } = require('../src/server');

test('GET /health returns 200 and HEALTHY status', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, 'HEALTHY');
    assert.strictEqual(body.service, 'streamforge-api');
  } finally {
    server.close();
  }
});

test('GET /api/health returns 200 and version info', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, 'HEALTHY');
    assert.strictEqual(body.version, '1.0.0');
  } finally {
    server.close();
  }
});
