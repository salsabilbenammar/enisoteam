const express = require('express');
const clubInfoController = require('../controllers/clubInfoController');
const { requireAdmin } = require('../middlewares/authMiddleware');
const { uploadMedia } = require('../middlewares/uploadMiddleware');

const router = express.Router();
const upload = uploadMedia('club').single('image');

router.get('/', clubInfoController.getAll);
router.get('/:id', clubInfoController.getById);
router.post('/', requireAdmin, upload, clubInfoController.create);
router.put('/:id', requireAdmin, upload, clubInfoController.update);
router.delete('/:id', requireAdmin, clubInfoController.remove);

module.exports = router;
