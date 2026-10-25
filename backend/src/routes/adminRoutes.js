const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const adminController = require('../controllers/adminController');

router.use(authMiddleware, requireRole('admin'));

router.get('/users', adminController.listUsers);
router.put('/users/:id/role', adminController.changeRole);
router.get('/activity', adminController.activity);

module.exports = router;
