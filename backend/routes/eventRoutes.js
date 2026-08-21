const express = require('express');
const eventController = require('../controllers/eventController');
const { requireAdmin } = require('../middlewares/authMiddleware');
const { uploadImage } = require('../middlewares/uploadMiddleware');

const router = express.Router();
const upload = uploadImage('events').single('image');

router.get('/', eventController.getAll);
router.get('/:id/registrations', requireAdmin, eventController.listRegistrations);
router.put('/:id/liste-finale', requireAdmin, eventController.saveListeFinale);
router.post('/:id/send-selection-emails', requireAdmin, eventController.sendSelectionEmails);
router.patch(
  '/:id/registrations/:registrationId/paiement',
  requireAdmin,
  eventController.setRegistrationPayment
);
router.post('/:id/register', eventController.register);
router.patch('/:id/inscription', requireAdmin, eventController.setInscriptionOpen);
router.get('/:id', eventController.getById);
router.post('/', requireAdmin, upload, eventController.create);
router.put('/:id', requireAdmin, upload, eventController.update);
router.delete('/:id', requireAdmin, eventController.remove);

module.exports = router;
