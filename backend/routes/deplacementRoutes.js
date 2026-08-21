const express = require('express');
const deplacementController = require('../controllers/deplacementController');
const { requireAdmin, requireMember, optionalAuth } = require('../middlewares/authMiddleware');
const { uploadImage } = require('../middlewares/uploadMiddleware');

const router = express.Router();
const uploadAffiche = uploadImage('deplacements').single('affiche');

router.get('/', optionalAuth, deplacementController.getAll);
router.get('/open', requireMember, deplacementController.getOpen);
router.get('/:id/registrations', requireAdmin, deplacementController.listRegistrations);
router.put('/:id/liste-finale', requireAdmin, deplacementController.saveListeFinale);
router.patch(
  '/:id/registrations/:registrationId/paiement',
  requireAdmin,
  deplacementController.setRegistrationPayment
);
router.post('/:id/register', requireMember, deplacementController.register);
router.patch('/:id/inscription', requireAdmin, deplacementController.setInscriptionOpen);
router.get('/:id', optionalAuth, deplacementController.getById);
router.post('/', requireAdmin, uploadAffiche, deplacementController.create);
router.put('/:id', requireAdmin, uploadAffiche, deplacementController.update);
router.delete('/:id', requireAdmin, deplacementController.remove);

module.exports = router;
