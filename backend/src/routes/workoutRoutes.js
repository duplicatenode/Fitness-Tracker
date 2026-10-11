const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const workoutController = require('../controllers/workoutController');

router.use(authMiddleware);

router.get('/exercises', workoutController.getExercises);

router.get('/plans', workoutController.getPlans);
router.post('/plans', workoutController.createPlan);
router.get('/plans/:id', workoutController.getPlan);
router.put('/plans/:id', workoutController.updatePlan);
router.delete('/plans/:id', workoutController.deletePlan);

router.get('/sessions', workoutController.getSessions);
router.post('/sessions', workoutController.createSession);
router.get('/sessions/:id', workoutController.getSession);
router.put('/sessions/:id/end', workoutController.endSession);

module.exports = router;
