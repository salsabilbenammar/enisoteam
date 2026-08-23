const express = require('express');
const rhController = require('../controllers/rhController');
const {
  requireAdmin,
  requireModuleWrite,
  requireMember,
} = require('../middlewares/authMiddleware');

const router = express.Router();
const canWrite = requireModuleWrite('rh');

router.get('/merits/me', requireMember, rhController.getMyMerits);
router.get('/merits/leaderboard', requireMember, rhController.getLeaderboard);
router.post('/reports', requireMember, rhController.createReport);
router.post('/suggestions', requireMember, rhController.createSuggestion);
router.post('/training-requests', requireMember, rhController.createTrainingRequest);

router.get('/merits/catalog', requireAdmin, rhController.getCatalog);
router.get('/merits/scores', requireAdmin, rhController.getScores);
router.post('/merits/sync', canWrite, rhController.syncMerits);
router.get('/merits', requireAdmin, rhController.getAllMerits);
router.post('/merits', canWrite, rhController.createMerit);
router.delete('/merits/:id', canWrite, rhController.removeMerit);

router.get('/forms/:type', requireAdmin, rhController.listForms);
router.patch('/forms/:type/:id', canWrite, rhController.updateFormStatus);
router.delete('/forms/:type/:id', canWrite, rhController.removeForm);

module.exports = router;
