const test = require('node:test');
const assert = require('node:assert');
const { app } = require('../src/server');

test('GET /api/channels/categories returns list of top categories', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/channels/categories`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
    assert.strictEqual(body.data[0].name, 'Valorant');
  } finally {
    server.close();
  }
});

test('POST /api/auth/register fails with missing fields', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' })
    });
    assert.strictEqual(res.status, 400);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error.message.includes('required'));
  } finally {
    server.close();
  }
});
