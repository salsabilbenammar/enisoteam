const express = require('express');
const eventController = require('../controllers/eventController');
const {
  requireAdmin,
  requireModuleWrite,
  optionalAuth,
} = require('../middlewares/authMiddleware');
const { uploadImage } = require('../middlewares/uploadMiddleware');

const router = express.Router();
const upload = uploadImage('events').single('image');
const canWrite = requireModuleWrite('events');

router.get('/', optionalAuth, eventController.getAll);
router.get('/:id/registrations', requireAdmin, eventController.listRegistrations);
router.put('/:id/liste-finale', canWrite, eventController.saveListeFinale);
router.post('/:id/send-selection-emails', canWrite, eventController.sendSelectionEmails);
router.patch(
  '/:id/registrations/:registrationId/paiement',
  canWrite,
  eventController.setRegistrationPayment
);
router.post('/:id/register', optionalAuth, eventController.register);
router.patch('/:id/inscription', canWrite, eventController.setInscriptionOpen);
router.get('/:id', optionalAuth, eventController.getById);
router.post('/', canWrite, upload, eventController.create);
router.put('/:id', canWrite, upload, eventController.update);
router.delete('/:id', canWrite, eventController.remove);

module.exports = router;
