const express = require('express');
const recruitmentController = require('../controllers/recruitmentController');
const { requireAdmin } = require('../middlewares/authMiddleware');
const { uploadRecruitment } = require('../middlewares/uploadMiddleware');

const router = express.Router();

/* Public */
router.get('/status', recruitmentController.getPublicStatus);
router.post('/apply', uploadRecruitment, recruitmentController.apply);
router.get('/book/:token', recruitmentController.getBookingPage);
router.post('/book/:token', recruitmentController.bookSlot);

/* Admin */
router.get('/candidates', requireAdmin, recruitmentController.listCandidates);
router.get('/stats', requireAdmin, recruitmentController.getStats);
router.get('/candidates/:id', requireAdmin, recruitmentController.getCandidate);
router.patch(
  '/candidates/:id/telephone',
  requireAdmin,
  recruitmentController.updateCandidateTelephone
);
router.patch('/candidates/status', requireAdmin, recruitmentController.bulkStatus);
router.delete('/candidates/:id', requireAdmin, recruitmentController.removeCandidate);
router.post(
  '/candidates/:id/send-confirmation',
  requireAdmin,
  recruitmentController.resendConfirmation
);
router.post(
  '/candidates/:id/mark-present',
  requireAdmin,
  recruitmentController.markPresent
);
router.post(
  '/candidates/:id/mark-absent',
  requireAdmin,
  recruitmentController.markAbsent
);
router.post(
  '/candidates/:id/send-success-payment',
  requireAdmin,
  recruitmentController.sendSuccessPayment
);

router.post('/invitations', requireAdmin, recruitmentController.scheduleInvitations);
router.post('/payment-requests', requireAdmin, recruitmentController.schedulePaymentRequests);
router.post('/payment-confirm', requireAdmin, recruitmentController.confirmPayments);

router.get('/slots', requireAdmin, recruitmentController.listSlots);
router.post('/slots', requireAdmin, recruitmentController.createSlot);
router.put('/slots/:id', requireAdmin, recruitmentController.updateSlot);
router.delete('/slots/:id', requireAdmin, recruitmentController.removeSlot);

router.get('/schedule', requireAdmin, recruitmentController.schedule);
router.get('/settings', requireAdmin, recruitmentController.getSettings);
router.put('/settings', requireAdmin, recruitmentController.updateSettings);
router.get('/emails', requireAdmin, recruitmentController.listEmails);

module.exports = router;
