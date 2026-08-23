const express = require('express');
const clubInfoController = require('../controllers/clubInfoController');
const { requireModuleWrite } = require('../middlewares/authMiddleware');
const { uploadMedia } = require('../middlewares/uploadMiddleware');

const router = express.Router();
const upload = uploadMedia('club').single('image');
const canWrite = requireModuleWrite('club_info');

router.get('/', clubInfoController.getAll);
router.get('/:id', clubInfoController.getById);
router.post('/', canWrite, upload, clubInfoController.create);
router.put('/:id', canWrite, upload, clubInfoController.update);
router.delete('/:id', canWrite, clubInfoController.remove);

module.exports = router;
