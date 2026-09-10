require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const errorHandler = require('../../shared/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 4003;

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.get('/health',     (_, res) => res.json({ status: 'HEALTHY', service: 'vod-service' }));
app.get('/api/health', (_, res) => res.json({ status: 'HEALTHY', service: 'vod-service', version: '1.0.0' }));

const vodRoutes = require('./routes/vodRoutes');
app.use('/api/vods', vodRoutes);

app.use(errorHandler);

const server = http.createServer(app);
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => console.log(`[vod-service] Listening on port ${PORT}`));
}
module.exports = { app, server };
