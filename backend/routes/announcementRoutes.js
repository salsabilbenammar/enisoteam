const express = require('express');
const announcementController = require('../controllers/announcementController');
const { requireAdmin } = require('../middlewares/authMiddleware');
const { uploadImage } = require('../middlewares/uploadMiddleware');

const router = express.Router();
const upload = uploadImage('announcements').single('image');

router.get('/', announcementController.getAll);
router.get('/:id', announcementController.getById);
router.post('/', requireAdmin, upload, announcementController.create);
router.put('/:id', requireAdmin, upload, announcementController.update);
router.delete('/:id', requireAdmin, announcementController.remove);

module.exports = router;
