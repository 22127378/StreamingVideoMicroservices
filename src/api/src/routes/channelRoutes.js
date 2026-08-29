const express = require('express');
const router = express.Router();
const channelController = require('../controllers/channelController');
const { authenticate, optionalAuth } = require('../middlewares/authMiddleware');

router.get('/', (req, res, next) => channelController.getChannels(req, res, next));
router.get('/categories', (req, res, next) => channelController.getCategories(req, res, next));
router.get('/category/:category', (req, res, next) => channelController.getChannelsByCategory(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => channelController.getChannelById(req, res, next));
router.put('/:id', authenticate, (req, res, next) => channelController.updateChannel(req, res, next));
router.post('/:id/follow', authenticate, (req, res, next) => channelController.toggleFollow(req, res, next));

module.exports = router;
