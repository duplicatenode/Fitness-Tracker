const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/demo', authController.demoLogin);
router.get('/me', authMiddleware, authController.me);
router.put('/me', authMiddleware, authController.updateMe);
router.put('/password', authMiddleware, authController.changePassword);

module.exports = router;
