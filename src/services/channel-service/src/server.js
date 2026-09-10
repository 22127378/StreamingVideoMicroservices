require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('../../shared/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 4002;

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '10mb' }));

app.get('/health',     (_, res) => res.json({ status: 'HEALTHY', service: 'channel-service' }));
app.get('/api/health', (_, res) => res.json({ status: 'HEALTHY', service: 'channel-service', version: '1.0.0' }));

const channelRoutes  = require('./routes/channelRoutes');
const internalRoutes = require('./routes/internalRoutes');
app.use('/api/channels', channelRoutes);
app.use('/internal',     internalRoutes);   // For inter-service calls from auth-service

app.use(errorHandler);

const server = http.createServer(app);
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => console.log(`[channel-service] Listening on port ${PORT}`));
}
module.exports = { app, server };
