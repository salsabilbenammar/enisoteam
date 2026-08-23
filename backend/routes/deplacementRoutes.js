const express = require('express');
const deplacementController = require('../controllers/deplacementController');
const {
  requireAdmin,
  requireModuleWrite,
  requireMember,
  optionalAuth,
} = require('../middlewares/authMiddleware');
const { uploadImage } = require('../middlewares/uploadMiddleware');

const router = express.Router();
const uploadAffiche = uploadImage('deplacements').single('affiche');
const canWrite = requireModuleWrite('deplacements');

router.get('/', optionalAuth, deplacementController.getAll);
router.get('/open', requireMember, deplacementController.getOpen);
router.get('/:id/registrations', requireAdmin, deplacementController.listRegistrations);
router.put('/:id/liste-finale', canWrite, deplacementController.saveListeFinale);
router.patch(
  '/:id/registrations/:registrationId/paiement',
  canWrite,
  deplacementController.setRegistrationPayment
);
router.post('/:id/register', requireMember, deplacementController.register);
router.patch('/:id/inscription', canWrite, deplacementController.setInscriptionOpen);
router.get('/:id', optionalAuth, deplacementController.getById);
router.post('/', canWrite, uploadAffiche, deplacementController.create);
router.put('/:id', canWrite, uploadAffiche, deplacementController.update);
router.delete('/:id', canWrite, deplacementController.remove);

module.exports = router;
