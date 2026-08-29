/**
 * JWT Authentication Middleware
 * Validates Bearer token from Authorization header and attaches user context to req.user.
 */

const jwt = require('jsonwebtoken');
const dynamoService = require('../services/dynamoService');

const JWT_SECRET = process.env.JWT_SECRET || 'streamforge-dev-secret-key-2026-secure';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required. Missing or malformed token.' }
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await dynamoService.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'User belonging to this token no longer exists.' }
      });
    }

    req.user = {
      userId: user.user_id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      role: user.role || 'user'
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid or expired token.', code: 'INVALID_TOKEN' }
      });
    }
    next(error);
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await dynamoService.getUserById(decoded.userId);
      if (user) {
        req.user = {
          userId: user.user_id,
          email: user.email,
          username: user.username,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
          role: user.role || 'user'
        };
      }
    }
  } catch (err) {
    // Ignore error for optional authentication
  }
  next();
};

module.exports = { authenticate, optionalAuth, JWT_SECRET };
