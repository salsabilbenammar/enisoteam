const express = require('express');
const galleryController = require('../controllers/galleryController');
const { requireModuleWrite } = require('../middlewares/authMiddleware');
const { uploadMedia } = require('../middlewares/uploadMiddleware');

const router = express.Router();
const upload = uploadMedia('gallery').single('image');
const canWrite = requireModuleWrite('gallery');

router.get('/', galleryController.getAll);
router.get('/:id', galleryController.getById);
router.post('/', canWrite, upload, galleryController.create);
router.put('/:id', canWrite, upload, galleryController.update);
router.delete('/:id', canWrite, galleryController.remove);

module.exports = router;
