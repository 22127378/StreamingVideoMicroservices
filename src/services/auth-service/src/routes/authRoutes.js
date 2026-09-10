const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const dynamoService = require('../services/dynamoService');
const { makeAuthMiddleware } = require('../../../shared/middleware/authMiddleware');
const { authenticate } = makeAuthMiddleware(dynamoService);

router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login',    (req, res, next) => authController.login(req, res, next));
router.get('/me',        authenticate, (req, res, next) => authController.getMe(req, res, next));

module.exports = router;
