const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const journalController = require('../controllers/journalController');

router.use(authMiddleware);

router.get('/', journalController.getJournals);
router.post('/', journalController.createJournal);
router.put('/:id', journalController.updateJournal);
router.delete('/:id', journalController.deleteJournal);

module.exports = router;
