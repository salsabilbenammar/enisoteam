const express = require('express');
const trainingController = require('../controllers/trainingController');
const { requireAdmin, optionalAuth, requireMember } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', optionalAuth, trainingController.getAll);
router.get('/:id/registrations', requireAdmin, trainingController.listRegistrations);
router.patch(
  '/:id/registrations/:registrationId/paiement',
  requireAdmin,
  trainingController.setRegistrationPayment
);
router.post('/:id/register', requireMember, trainingController.register);
router.patch('/:id/inscription', requireAdmin, trainingController.setInscriptionOpen);
router.get('/:id', optionalAuth, trainingController.getById);
router.post('/', requireAdmin, trainingController.create);
router.put('/:id', requireAdmin, trainingController.update);
router.delete('/:id', requireAdmin, trainingController.remove);

module.exports = router;
