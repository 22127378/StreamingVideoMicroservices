const express = require('express');
const router = express.Router();
const vodController = require('../controllers/vodController');
const { authenticate } = require('../middlewares/authMiddleware');

router.get('/', (req, res, next) => vodController.listVods(req, res, next));
router.get('/:id', (req, res, next) => vodController.getVodById(req, res, next));
router.post('/presign-upload', authenticate, (req, res, next) => vodController.presignUpload(req, res, next));
router.post('/:id/unlock-vip', (req, res, next) => vodController.unlockVipStream(req, res, next));

module.exports = router;
