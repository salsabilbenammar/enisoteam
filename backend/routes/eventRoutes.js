const express = require('express');
const eventController = require('../controllers/eventController');
const { requireAdmin } = require('../middlewares/authMiddleware');
const { uploadImage } = require('../middlewares/uploadMiddleware');

const router = express.Router();
const upload = uploadImage('events').single('image');

router.get('/', eventController.getAll);
router.get('/:id', eventController.getById);
router.post('/', requireAdmin, upload, eventController.create);
router.put('/:id', requireAdmin, upload, eventController.update);
router.delete('/:id', requireAdmin, eventController.remove);

module.exports = router;
