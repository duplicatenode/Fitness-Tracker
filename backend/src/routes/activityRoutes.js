const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const activityController = require('../controllers/activityController');

router.use(authMiddleware);

router.get('/status', activityController.getStatus);
router.get('/readings', activityController.getReadings);
router.get('/daily', activityController.getDaily);

module.exports = router;
