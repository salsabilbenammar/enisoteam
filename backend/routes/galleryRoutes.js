const express = require('express');
const galleryController = require('../controllers/galleryController');
const { requireAdmin } = require('../middlewares/authMiddleware');
const { uploadMedia } = require('../middlewares/uploadMiddleware');

const router = express.Router();
const upload = uploadMedia('gallery').single('image');

router.get('/', galleryController.getAll);
router.get('/:id', galleryController.getById);
router.post('/', requireAdmin, upload, galleryController.create);
router.put('/:id', requireAdmin, upload, galleryController.update);
router.delete('/:id', requireAdmin, galleryController.remove);

module.exports = router;
