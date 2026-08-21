const express = require('express');
const rhController = require('../controllers/rhController');
const { requireAdmin, requireMember } = require('../middlewares/authMiddleware');

const router = express.Router();

/* Membres */
router.get('/merits/me', requireMember, rhController.getMyMerits);
router.get('/merits/leaderboard', requireMember, rhController.getLeaderboard);
router.post('/reports', requireMember, rhController.createReport);
router.post('/suggestions', requireMember, rhController.createSuggestion);
router.post('/training-requests', requireMember, rhController.createTrainingRequest);

/* Admin — mérites */
router.get('/merits/catalog', requireAdmin, rhController.getCatalog);
router.get('/merits/scores', requireAdmin, rhController.getScores);
router.post('/merits/sync', requireAdmin, rhController.syncMerits);
router.get('/merits', requireAdmin, rhController.getAllMerits);
router.post('/merits', requireAdmin, rhController.createMerit);
router.delete('/merits/:id', requireAdmin, rhController.removeMerit);

/* Admin — formulaires (reports | suggestions | training_requests) */
router.get('/forms/:type', requireAdmin, rhController.listForms);
router.patch('/forms/:type/:id', requireAdmin, rhController.updateFormStatus);
router.delete('/forms/:type/:id', requireAdmin, rhController.removeForm);

module.exports = router;
