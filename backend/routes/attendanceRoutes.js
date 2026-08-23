const express = require('express');
const attendanceController = require('../controllers/attendanceController');
const { requireAdmin, requireModuleWrite } = require('../middlewares/authMiddleware');

const router = express.Router();
const canWrite = requireModuleWrite('attendance');

router.get('/public/:token', attendanceController.getPublicSession);
router.post('/public/:token/entries', attendanceController.addEntryPublic);

router.get('/', requireAdmin, attendanceController.getAll);
router.get('/:id', requireAdmin, attendanceController.getById);
router.post('/', canWrite, attendanceController.create);
router.put('/:id', canWrite, attendanceController.update);
router.delete('/:id', canWrite, attendanceController.remove);
router.post('/:id/entries', canWrite, attendanceController.addEntryAdmin);
router.delete('/:id/entries/:entryId', canWrite, attendanceController.removeEntry);

module.exports = router;
