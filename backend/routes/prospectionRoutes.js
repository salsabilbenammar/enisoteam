const express = require('express');
const prospectionController = require('../controllers/prospectionController');
const { requireModuleWrite, optionalAuth } = require('../middlewares/authMiddleware');
const { uploadImage } = require('../middlewares/uploadMiddleware');

const router = express.Router();
const upload = uploadImage('prospection').single('image');
const canWrite = requireModuleWrite('prospection');

router.get('/status', optionalAuth, prospectionController.getStatus);
router.get('/', optionalAuth, prospectionController.getAll);
router.get('/:id', optionalAuth, prospectionController.getById);

router.post('/', canWrite, upload, prospectionController.create);
router.put('/:id', canWrite, upload, prospectionController.update);
router.delete('/:id', canWrite, prospectionController.remove);

module.exports = router;
