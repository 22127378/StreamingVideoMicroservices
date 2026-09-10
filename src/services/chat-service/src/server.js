require('dotenv').config();
const http    = require('http');
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const errorHandler = require('../../shared/middleware/errorHandler');
const chatGateway  = require('./gateway/chatGateway');

const app  = express();
const PORT = process.env.PORT || 4004;

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/health',     (_, res) => res.json({ status: 'HEALTHY', service: 'chat-service', rooms: chatGateway.getRoomCount() }));
app.get('/api/health', (_, res) => res.json({ status: 'HEALTHY', service: 'chat-service', version: '1.0.0' }));

// REST endpoint: viewer count for a channel (polled by frontend when WS is unavailable)
app.get('/api/chat/:channelId/viewers', (req, res) => {
  res.json({ success: true, data: { channelId: req.params.channelId, viewerCount: chatGateway.getViewerCount(req.params.channelId) } });
});

app.use(errorHandler);

const server = http.createServer(app);
chatGateway.init(server);   // Attach WebSocket server to the same HTTP port

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`[chat-service] HTTP + WebSocket listening on port ${PORT}`);
    console.log(`[chat-service] WebSocket path: ws://localhost:${PORT}/ws`);
  });
}

module.exports = { app, server };
