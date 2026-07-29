const express = require('express');
const boardController = require('../controllers/boardController');
const { requireAdmin } = require('../middlewares/authMiddleware');
const { uploadImage } = require('../middlewares/uploadMiddleware');

const router = express.Router();
const upload = uploadImage('board').single('photo');

router.get('/', boardController.getAll);
router.get('/:id', boardController.getById);
router.post('/', requireAdmin, upload, boardController.create);
router.put('/:id', requireAdmin, upload, boardController.update);
router.delete('/:id', requireAdmin, boardController.remove);

module.exports = router;
