/**
 * StreamForge API Server Entrypoint
 * Express REST API & WebSocket Realtime Gateway
 */

require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 4000;

// Security & Parsing Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false
}));

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Origin-Verify']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check Endpoints (For ALB Target Group and Kubernetes Liveness/Readiness probes)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'streamforge-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'streamforge-api',
    version: '1.0.0',
    region: process.env.AWS_REGION || 'us-east-1',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
const authRoutes = require('./routes/authRoutes');
const channelRoutes = require('./routes/channelRoutes');
const streamRoutes = require('./routes/streamRoutes');
const vodRoutes = require('./routes/vodRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/vods', vodRoutes);

// Create HTTP Server for both Express REST API and WebSocket Gateway
const server = http.createServer(app);

// Initialize WebSocket Live Chat Gateway
const chatGateway = require('./websocket/chatGateway');
chatGateway.init(server);

// Global Error Handler Middleware
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[StreamForge API] Server running on port ${PORT}`);
    console.log(`[Health Check] Available at http://localhost:${PORT}/health`);
    console.log(`[Live Chat WS] WebSocket Gateway listening at ws://localhost:${PORT}/ws`);
  });
}

module.exports = { app, server, chatGateway };
