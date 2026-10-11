const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const photoController = require('../controllers/photoController');

router.use(authMiddleware);

router.get('/', photoController.getPhotos);
router.post('/', photoController.createPhoto);
router.delete('/:id', photoController.deletePhoto);

module.exports = router;
