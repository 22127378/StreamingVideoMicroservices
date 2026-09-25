/**
 * Authentication Controller
 * Handles user registration, login, JWT token issuance, and profile retrieval.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const dynamoService = require('../services/dynamoService');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

class AuthController {
  async register(req, res, next) {
    try {
      const { email, username, password, displayName } = req.body;

      if (!email || !username || !password) {
        return res.status(400).json({
          success: false,
          error: { message: 'Email, username, and password are required.' }
        });
      }

      // 1. Check if email or username already exists
      const existingEmail = await dynamoService.getUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          error: { message: 'An account with this email already exists.' }
        });
      }

      const existingUsername = await dynamoService.getUserByUsername(username);
      if (existingUsername) {
        return res.status(409).json({
          success: false,
          error: { message: 'This username is already taken.' }
        });
      }

      // 2. Hash Password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // 3. Create User in DynamoDB
      const userId = `usr_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
      const streamKey = `live_${uuidv4().replace(/-/g, '')}`;

      const newUser = {
        user_id: userId,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        display_name: displayName || username,
        password_hash: hashedPassword,
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
        role: 'user',
        stream_key: streamKey,
        created_at: new Date().toISOString()
      };

      await dynamoService.createUser(newUser);

      // 4. Automatically Create Stream Channel for the user
      const channelId = `chn_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
      const newChannel = {
        channel_id: channelId,
        streamer_id: userId,
        streamer_name: newUser.display_name,
        streamer_username: newUser.username,
        streamer_avatar: newUser.avatar_url,
        title: `Welcome to ${newUser.display_name}'s live stream!`,
        category: 'Just Chatting',
        tags: ['English', 'Gaming', 'Chill'],
        is_live: 'false',
        viewer_count: 0,
        follower_count: 0,
        stream_key: streamKey,
        playback_url: process.env.CLOUDFRONT_DOMAIN
          ? `https://${process.env.CLOUDFRONT_DOMAIN}/hls/${userId}/master.m3u8`
          : 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8'
      };

      await dynamoService.createChannel(newChannel);

      // 5. Generate JWT Token
      const token = jwt.sign(
        { userId: newUser.user_id, username: newUser.username },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            userId: newUser.user_id,
            email: newUser.email,
            username: newUser.username,
            displayName: newUser.display_name,
            avatarUrl: newUser.avatar_url,
            role: newUser.role
          },
          channel: newChannel
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { identifier, password } = req.body; // identifier can be email or username

      if (!identifier || !password) {
        return res.status(400).json({
          success: false,
          error: { message: 'Identifier (email or username) and password are required.' }
        });
      }

      // Find user by email or username
      let user = await dynamoService.getUserByEmail(identifier);
      if (!user) {
        user = await dynamoService.getUserByUsername(identifier);
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid credentials.' }
        });
      }

      // Verify password hash
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid credentials.' }
        });
      }

      // Fetch user's channel
      const channel = await dynamoService.getChannelByStreamerId(user.user_id);

      // Generate JWT Token
      const token = jwt.sign(
        { userId: user.user_id, username: user.username },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(200).json({
        success: true,
        data: {
          token,
          user: {
            userId: user.user_id,
            email: user.email,
            username: user.username,
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
            role: user.role
          },
          channel: channel || null
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const user = await dynamoService.getUserById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { message: 'User not found.' }
        });
      }

      const channel = await dynamoService.getChannelByStreamerId(user.user_id);

      res.status(200).json({
        success: true,
        data: {
          user: {
            userId: user.user_id,
            email: user.email,
            username: user.username,
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
            streamKey: user.stream_key,
            role: user.role
          },
          channel: channel || null
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
