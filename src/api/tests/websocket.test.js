const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { WebSocket } = require('ws');
const { app, chatGateway } = require('../src/server');

test('WebSocket Chat Gateway connects, sends INIT_CONNECTED and broadcasts messages', async (t) => {
  const server = http.createServer(app);
  chatGateway.init(server);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const wsUrl = `ws://localhost:${port}/ws?channelId=test_channel`;
  const client1 = new WebSocket(wsUrl);

  const client1Messages = [];

  await new Promise((resolve, reject) => {
    client1.on('open', resolve);
    client1.on('error', reject);
    client1.on('message', (data) => {
      client1Messages.push(JSON.parse(data.toString()));
    });
  });

  // Client 1 should receive INIT_CONNECTED
  assert.ok(client1Messages.length > 0);
  assert.strictEqual(client1Messages[0].type, 'INIT_CONNECTED');
  assert.strictEqual(client1Messages[0].data.channelId, 'test_channel');

  // Client 1 sends a chat message
  client1.send(JSON.stringify({
    type: 'CHAT_MESSAGE',
    data: { text: 'Hello StreamForge community!' }
  }));

  // Wait a bit for message propagation
  await new Promise((resolve) => setTimeout(resolve, 100));

  const chatMsg = client1Messages.find(m => m.type === 'CHAT_MESSAGE');
  assert.ok(chatMsg);
  assert.strictEqual(chatMsg.data.text, 'Hello StreamForge community!');
  assert.strictEqual(chatMsg.data.channelId, 'test_channel');

  client1.close();
  server.close();
});
