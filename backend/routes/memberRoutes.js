const express = require('express');
const memberController = require('../controllers/memberController');
const { requireAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', requireAdmin, memberController.getAll);
router.get('/:id', requireAdmin, memberController.getById);
router.post('/', requireAdmin, memberController.create);
router.put('/:id', requireAdmin, memberController.update);
router.delete('/:id', requireAdmin, memberController.remove);

module.exports = router;
