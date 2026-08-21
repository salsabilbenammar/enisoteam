const express = require('express');
const attendanceController = require('../controllers/attendanceController');
const { requireAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/public/:token', attendanceController.getPublicSession);
router.post('/public/:token/entries', attendanceController.addEntryPublic);

router.get('/', requireAdmin, attendanceController.getAll);
router.get('/:id', requireAdmin, attendanceController.getById);
router.post('/', requireAdmin, attendanceController.create);
router.put('/:id', requireAdmin, attendanceController.update);
router.delete('/:id', requireAdmin, attendanceController.remove);
router.post('/:id/entries', requireAdmin, attendanceController.addEntryAdmin);
router.delete('/:id/entries/:entryId', requireAdmin, attendanceController.removeEntry);

module.exports = router;
