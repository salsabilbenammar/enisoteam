const express = require('express');
const boardController = require('../controllers/boardController');
const { requireModuleWrite } = require('../middlewares/authMiddleware');
const { uploadImage } = require('../middlewares/uploadMiddleware');

const router = express.Router();
const upload = uploadImage('board').single('photo');
const canWrite = requireModuleWrite('board');

router.get('/', boardController.getAll);
router.get('/:id', boardController.getById);
router.post('/', canWrite, upload, boardController.create);
router.put('/:id', canWrite, upload, boardController.update);
router.delete('/:id', canWrite, boardController.remove);

module.exports = router;
