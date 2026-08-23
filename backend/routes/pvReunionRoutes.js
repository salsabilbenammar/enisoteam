const express = require('express');
const pvReunionController = require('../controllers/pvReunionController');
const { requireAdmin, requireModuleWrite } = require('../middlewares/authMiddleware');
const { uploadPvDocument } = require('../middlewares/uploadMiddleware');

const router = express.Router();
const canWrite = requireModuleWrite('pv_reunions');

router.get('/', requireAdmin, pvReunionController.getAll);
router.get('/:id', requireAdmin, pvReunionController.getById);
router.post('/', canWrite, uploadPvDocument, pvReunionController.create);
router.put('/:id', canWrite, uploadPvDocument, pvReunionController.update);
router.delete('/:id', canWrite, pvReunionController.remove);

module.exports = router;
