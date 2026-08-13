const express = require('express');
const projectController = require('../controllers/projectController');
const authMiddleware = require('../middlewares/authMiddleware');
const { uploadImage, uploadProjectMemberPhotos, uploadProjectStepDocument } = require('../middlewares/uploadMiddleware');
const { requireAdmin, requireMember, optionalAuth } = authMiddleware;

const router = express.Router();
const upload = uploadImage('projects').single('image');

/* Public */
router.get('/public', optionalAuth, projectController.getPublicProjects);
router.get('/public/realizations', projectController.getPublishedRealizations);
router.get(
  '/public/assignments/:id/steps',
  optionalAuth,
  projectController.getPublicAssignmentSteps
);

/* Member form + workspace étapes */
router.get('/form-status', requireMember, projectController.getFormStatus);
router.get('/my-submission', requireMember, projectController.getMySubmission);
router.delete('/my-submission', requireMember, projectController.deleteMySubmission);
router.post('/submit', requireMember, uploadProjectMemberPhotos, projectController.submitForm);
router.get('/my-assignments', requireMember, projectController.listMyAssignments);
router.get('/my-assignments/:id/steps', requireMember, projectController.getMyAssignmentSteps);
router.post(
  '/my-assignments/:id/steps/:stepId/submit',
  requireMember,
  (req, res, next) => {
    uploadProjectStepDocument(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message || 'Upload invalide.' });
      next();
    });
  },
  projectController.submitMyStep
);
router.get(
  '/step-docs/:filename',
  requireMember,
  projectController.downloadStepDocument
);

/* Admin */
router.get('/settings', requireAdmin, projectController.adminGetSettings);
router.put('/settings', requireAdmin, projectController.adminUpdateSettings);

router.get('/catalog', requireAdmin, projectController.adminListProjects);
router.post('/catalog', requireAdmin, upload, projectController.adminCreateProject);
router.put('/catalog/:id', requireAdmin, upload, projectController.adminUpdateProject);
router.delete('/catalog/:id', requireAdmin, projectController.adminRemoveProject);

router.get('/catalog/:projectId/steps', requireAdmin, projectController.adminListProjectSteps);
router.post('/catalog/:projectId/steps', requireAdmin, projectController.adminCreateProjectStep);
router.put('/steps/:stepId', requireAdmin, projectController.adminUpdateProjectStep);
router.delete('/steps/:stepId', requireAdmin, projectController.adminRemoveProjectStep);

router.get('/submissions', requireAdmin, projectController.adminListSubmissions);
router.get('/assignments', requireAdmin, projectController.adminListAssignments);
router.post('/assignments/group', requireAdmin, projectController.adminAssignGroup);
router.post('/assignments/solos', requireAdmin, projectController.adminAssignSolos);
router.patch('/assignments/:id/progress', requireAdmin, projectController.adminUpdateAssignmentProgress);
router.delete('/assignments/:id', requireAdmin, projectController.adminRemoveAssignment);

router.get('/assignments/pending-steps', requireAdmin, projectController.adminListPendingSteps);
router.get('/assignments/:id/steps', requireAdmin, projectController.adminGetAssignmentSteps);
router.post(
  '/assignments/:id/steps/:stepId/validate',
  requireAdmin,
  projectController.adminValidateStep
);
router.post(
  '/assignments/:id/steps/:stepId/reject',
  requireAdmin,
  projectController.adminRejectStep
);

module.exports = router;
