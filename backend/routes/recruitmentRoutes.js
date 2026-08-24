const express = require('express');
const recruitmentController = require('../controllers/recruitmentController');
const { requireAdmin, requireModuleWrite } = require('../middlewares/authMiddleware');
const { uploadRecruitment } = require('../middlewares/uploadMiddleware');

const router = express.Router();
const canWrite = requireModuleWrite('recruitment');

router.get('/status', recruitmentController.getPublicStatus);
router.post('/apply', uploadRecruitment, recruitmentController.apply);
router.get('/book/:token', recruitmentController.getBookingPage);
router.post('/book/:token', recruitmentController.bookSlot);

router.get('/candidates', requireAdmin, recruitmentController.listCandidates);
router.get('/stats', requireAdmin, recruitmentController.getStats);
router.get('/candidates/:id', requireAdmin, recruitmentController.getCandidate);
router.get('/slots', requireAdmin, recruitmentController.listSlots);
router.get('/schedule', requireAdmin, recruitmentController.schedule);
router.get('/settings', requireAdmin, recruitmentController.getSettings);
router.get('/emails', requireAdmin, recruitmentController.listEmails);

router.patch('/candidates/:id/telephone', canWrite, recruitmentController.updateCandidateTelephone);
router.patch('/candidates/status', canWrite, recruitmentController.bulkStatus);
router.delete('/candidates/:id', canWrite, recruitmentController.removeCandidate);
router.post('/candidates/:id/send-confirmation', canWrite, recruitmentController.resendConfirmation);
router.post('/candidates/:id/mark-present', canWrite, recruitmentController.markPresent);
router.post('/candidates/:id/mark-absent', canWrite, recruitmentController.markAbsent);
router.post('/candidates/:id/send-success-payment', canWrite, recruitmentController.sendSuccessPayment);
router.post('/candidates/:id/send-payment-access', canWrite, recruitmentController.sendPaymentAccessMail);
router.post('/seniors', canWrite, recruitmentController.provisionSenior);

router.post('/invitations', canWrite, recruitmentController.scheduleInvitations);
router.post('/payment-requests', canWrite, recruitmentController.schedulePaymentRequests);
router.post('/payment-confirm', canWrite, recruitmentController.confirmPayments);

router.post('/slots', canWrite, recruitmentController.createSlot);
router.put('/slots/:id', canWrite, recruitmentController.updateSlot);
router.delete('/slots/:id', canWrite, recruitmentController.removeSlot);

router.put('/settings', canWrite, recruitmentController.updateSettings);

module.exports = router;
