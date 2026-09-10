/**
 * StreamForge Auth Service — Entry Point
 * Port: 4001
 * Responsibilities: register, login, getMe, JWT issuance
 * Inter-service call: POST channel-service /internal/channels (create channel on register)
 */

require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('../../shared/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 4001;

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '10mb' }));

// Health checks
app.get('/health', (_, res) => res.json({ status: 'HEALTHY', service: 'auth-service', uptime: process.uptime() }));
app.get('/api/health', (_, res) => res.json({ status: 'HEALTHY', service: 'auth-service', version: '1.0.0' }));

// Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

app.use(errorHandler);

const server = http.createServer(app);

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`[auth-service] Listening on port ${PORT}`);
  });
}

module.exports = { app, server };
