const express = require('express');
const memberController = require('../controllers/memberController');
const { requireAdmin, requireModuleWrite } = require('../middlewares/authMiddleware');

const router = express.Router();
const canWrite = requireModuleWrite('members');

router.get('/', requireAdmin, memberController.getAll);
router.get('/:id', requireAdmin, memberController.getById);
router.post('/', canWrite, memberController.create);
router.put('/:id', canWrite, memberController.update);
router.delete('/:id', canWrite, memberController.remove);

module.exports = router;
