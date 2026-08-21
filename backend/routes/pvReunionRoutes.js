const express = require('express');
const pvReunionController = require('../controllers/pvReunionController');
const { requireAdmin } = require('../middlewares/authMiddleware');
const { uploadPvDocument } = require('../middlewares/uploadMiddleware');

const router = express.Router();

router.get('/', requireAdmin, pvReunionController.getAll);
router.get('/:id', requireAdmin, pvReunionController.getById);
router.post('/', requireAdmin, uploadPvDocument, pvReunionController.create);
router.put('/:id', requireAdmin, uploadPvDocument, pvReunionController.update);
router.delete('/:id', requireAdmin, pvReunionController.remove);

module.exports = router;
