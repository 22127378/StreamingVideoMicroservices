/**
 * auth-service — Auth Controller
 * Inter-service: After register, calls channel-service /internal/channels to create the channel.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const dynamoService = require('../services/dynamoService');

const JWT_SECRET = process.env.JWT_SECRET || 'streamforge-dev-secret-key-2026-secure';
const CHANNEL_SERVICE_URL = process.env.CHANNEL_SERVICE_URL || 'http://channel-service:4002';

function issueToken(userId, username) {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });
}

class AuthController {
  async register(req, res, next) {
    try {
      const { email, username, password, displayName } = req.body;
      if (!email || !username || !password) {
        return res.status(400).json({ success: false, error: { message: 'Email, username, and password are required.' } });
      }

      if (await dynamoService.getUserByEmail(email)) {
        return res.status(409).json({ success: false, error: { message: 'An account with this email already exists.' } });
      }
      if (await dynamoService.getUserByUsername(username)) {
        return res.status(409).json({ success: false, error: { message: 'This username is already taken.' } });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userId    = `usr_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
      const streamKey = `live_${uuidv4().replace(/-/g, '')}`;

      const newUser = {
        user_id:       userId,
        email:         email.toLowerCase(),
        username:      username.toLowerCase(),
        display_name:  displayName || username,
        password_hash: hashedPassword,
        avatar_url:    `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
        role:          'user',
        stream_key:    streamKey,
        created_at:    new Date().toISOString()
      };
      await dynamoService.createUser(newUser);

      // Inter-service call: ask channel-service to create the channel
      let newChannel = null;
      try {
        const fetch = (await import('node-fetch')).default;
        const resp = await fetch(`${CHANNEL_SERVICE_URL}/internal/channels`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Internal-Service': 'auth-service' },
          body: JSON.stringify({
            user_id:    userId,
            username:   newUser.username,
            display_name: newUser.display_name,
            avatar_url: newUser.avatar_url,
            stream_key: streamKey
          })
        });
        if (resp.ok) newChannel = (await resp.json()).data;
      } catch (e) {
        console.warn('[auth-service] Could not reach channel-service to create channel:', e.message);
      }

      const token = issueToken(newUser.user_id, newUser.username);
      res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            userId:      newUser.user_id,
            email:       newUser.email,
            username:    newUser.username,
            displayName: newUser.display_name,
            avatarUrl:   newUser.avatar_url,
            role:        newUser.role
          },
          channel: newChannel
        }
      });
    } catch (error) { next(error); }
  }

  async login(req, res, next) {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({ success: false, error: { message: 'Identifier and password are required.' } });
      }

      let user = await dynamoService.getUserByEmail(identifier);
      if (!user) user = await dynamoService.getUserByUsername(identifier);
      if (!user) return res.status(401).json({ success: false, error: { message: 'Invalid credentials.' } });

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) return res.status(401).json({ success: false, error: { message: 'Invalid credentials.' } });

      // Fetch channel from channel-service
      let channel = null;
      try {
        const fetch = (await import('node-fetch')).default;
        const resp = await fetch(`${CHANNEL_SERVICE_URL}/internal/channels/by-user/${user.user_id}`, {
          headers: { 'X-Internal-Service': 'auth-service' }
        });
        if (resp.ok) channel = (await resp.json()).data;
      } catch (e) {
        console.warn('[auth-service] Could not reach channel-service:', e.message);
      }

      const token = issueToken(user.user_id, user.username);
      res.status(200).json({
        success: true,
        data: {
          token,
          user: {
            userId:      user.user_id,
            email:       user.email,
            username:    user.username,
            displayName: user.display_name,
            avatarUrl:   user.avatar_url,
            role:        user.role
          },
          channel
        }
      });
    } catch (error) { next(error); }
  }

  async getMe(req, res, next) {
    try {
      const user = await dynamoService.getUserById(req.user.userId);
      if (!user) return res.status(404).json({ success: false, error: { message: 'User not found.' } });

      let channel = null;
      try {
        const fetch = (await import('node-fetch')).default;
        const resp = await fetch(`${CHANNEL_SERVICE_URL}/internal/channels/by-user/${user.user_id}`, {
          headers: { 'X-Internal-Service': 'auth-service' }
        });
        if (resp.ok) channel = (await resp.json()).data;
      } catch (e) { /* non-critical */ }

      res.status(200).json({
        success: true,
        data: {
          user: {
            userId:      user.user_id,
            email:       user.email,
            username:    user.username,
            displayName: user.display_name,
            avatarUrl:   user.avatar_url,
            streamKey:   user.stream_key,
            role:        user.role
          },
          channel
        }
      });
    } catch (error) { next(error); }
  }
}

module.exports = new AuthController();
