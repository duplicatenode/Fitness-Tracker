const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const adminController = require('../controllers/adminController');
const catalogueController = require('../controllers/catalogueController');

router.use(authMiddleware, requireRole('admin'));

router.get('/users', adminController.listUsers);
router.put('/users/:id/role', adminController.changeRole);
router.get('/activity', adminController.activity);

// Exercise catalogue: only admins create, edit and delete body parts and exercises
router.get('/body-parts', catalogueController.listBodyParts);
router.post('/body-parts', catalogueController.createBodyPart);
router.put('/body-parts/:id', catalogueController.updateBodyPart);
router.delete('/body-parts/:id', catalogueController.deleteBodyPart);
router.post('/exercises', catalogueController.createExercise);
router.put('/exercises/:id', catalogueController.updateExercise);
router.delete('/exercises/:id', catalogueController.deleteExercise);

module.exports = router;
