const express = require('express');
const trainingController = require('../controllers/trainingController');
const {
  requireAdmin,
  requireModuleWrite,
  optionalAuth,
  requireMember,
} = require('../middlewares/authMiddleware');
const { uploadImage } = require('../middlewares/uploadMiddleware');

const router = express.Router();
const canWrite = requireModuleWrite('trainings');
const upload = uploadImage('trainings').single('image');

router.get('/', optionalAuth, trainingController.getAll);
router.get('/:id/registrations', requireAdmin, trainingController.listRegistrations);
router.patch(
  '/:id/registrations/:registrationId/paiement',
  canWrite,
  trainingController.setRegistrationPayment
);
router.post('/:id/register', requireMember, trainingController.register);
router.patch('/:id/inscription', canWrite, trainingController.setInscriptionOpen);
router.get('/:id', optionalAuth, trainingController.getById);
router.post('/', canWrite, upload, trainingController.create);
router.put('/:id', canWrite, upload, trainingController.update);
router.delete('/:id', canWrite, trainingController.remove);

module.exports = router;
