const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/channelController');
const dynamoService = require('../services/dynamoService');
const { makeAuthMiddleware } = require('../../../shared/middleware/authMiddleware');
const { authenticate, optionalAuth } = makeAuthMiddleware(dynamoService);

router.get('/',                    ctrl.getChannels.bind(ctrl));
router.get('/categories',          ctrl.getCategories.bind(ctrl));
router.get('/category/:category',  ctrl.getChannelsByCategory.bind(ctrl));
router.get('/:id',                 optionalAuth, ctrl.getChannelById.bind(ctrl));
router.get('/:id/followers',       ctrl.getFollowers.bind(ctrl));
router.post('/:id/follow',         authenticate, ctrl.toggleFollow.bind(ctrl));
router.put('/:id',                 authenticate, ctrl.updateChannel.bind(ctrl));

module.exports = router;
