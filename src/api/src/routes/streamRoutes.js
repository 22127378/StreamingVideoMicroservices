const express = require('express');
const router = express.Router();
const streamController = require('../controllers/streamController');
const { authenticate } = require('../middlewares/authMiddleware');

router.get('/key', authenticate, (req, res, next) => streamController.getStreamKey(req, res, next));
router.post('/key/reset', authenticate, (req, res, next) => streamController.resetStreamKey(req, res, next));
router.post('/verify-key', (req, res, next) => streamController.verifyStreamKey(req, res, next));
router.get('/health/:channelId', (req, res, next) => streamController.getStreamHealth(req, res, next));

module.exports = router;
