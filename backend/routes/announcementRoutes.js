const express = require('express');
const announcementController = require('../controllers/announcementController');
const { requireModuleWrite, requireMember } = require('../middlewares/authMiddleware');
const { uploadImage } = require('../middlewares/uploadMiddleware');

const router = express.Router();
const upload = uploadImage('announcements').single('image');
const canWrite = requireModuleWrite('announcements');

router.get('/', requireMember, announcementController.getAll);
router.get('/:id', requireMember, announcementController.getById);
router.post('/', canWrite, upload, announcementController.create);
router.put('/:id', canWrite, upload, announcementController.update);
router.delete('/:id', canWrite, announcementController.remove);

module.exports = router;
