const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const goalController = require('../controllers/goalController');

router.use(authMiddleware);

router.get('/', goalController.getGoals);
router.post('/', goalController.createGoal);
router.put('/:id', goalController.updateGoal);
router.delete('/:id', goalController.deleteGoal);

module.exports = router;
