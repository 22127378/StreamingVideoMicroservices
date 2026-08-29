const test = require('node:test');
const assert = require('node:assert');
const { app } = require('../src/server');

test('GET /api/vods returns list of available VODs', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/vods`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.vods));
    assert.ok(body.data.vods.length > 0);
  } finally {
    server.close();
  }
});

test('GET /api/streams/health/test-channel returns stream health telemetry', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/streams/health/test-channel`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.health !== undefined);
  } finally {
    server.close();
  }
});

test('POST /api/vods/123/unlock-vip attaches signed cookies response', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/vods/vod_test_vip/unlock-vip`, {
      method: 'POST'
    });
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.message.includes('VIP'));
  } finally {
    server.close();
  }
});
