const express = require('express');
const financeController = require('../controllers/financeController');
const { requireAdmin, requireMember } = require('../middlewares/authMiddleware');
const { uploadFinanceJustificatif, uploadImage } = require('../middlewares/uploadMiddleware');

const router = express.Router();

/* Membres : formulaires externes ouverts (liens site officiel) */
router.get('/offers/open', requireMember, financeController.listOpenOffers);
router.get('/merchandise/:variant', requireMember, financeController.getMerchForm);
router.post('/merchandise/:variant/orders', requireMember, financeController.submitMerchOrder);

router.use(requireAdmin);

router.get('/settings', financeController.getSettings);
router.put('/settings', financeController.updateSettings);

router.get('/members', financeController.listMembersLite);
router.get('/cotisation-types', financeController.listCotisationTypes);
router.get('/form-options', financeController.listFormOptions);
router.get('/eligible-members', financeController.listEligibleMembers);

router.get('/pull-forms', financeController.adminListPullForms);
router.put(
  '/pull-forms/:variant',
  uploadImage('merch').fields([
    { name: 'photo', maxCount: 1 },
    { name: 'photo_back', maxCount: 1 },
  ]),
  financeController.adminUpdatePullForm
);
router.get('/merchandise-orders', financeController.adminListMerchOrders);
router.patch(
  '/merchandise-orders/:id/status',
  financeController.adminUpdateMerchOrderStatus
);
router.delete(
  '/merchandise-orders/:id',
  financeController.adminRemoveMerchOrder
);

router.get('/offers', financeController.adminListOffers);
router.post('/offers', financeController.adminCreateOffer);
router.put('/offers/:id', financeController.adminUpdateOffer);
router.delete('/offers/:id', financeController.adminRemoveOffer);

router.get('/cotisations', financeController.listCotisations);
router.get('/payments', financeController.listPayments);
router.get('/payments/member/:memberId', financeController.memberPaymentHistory);
router.delete('/payments/member/:memberId', financeController.removeMemberPayments);
router.post('/payments', financeController.createPayment);
router.delete('/payments/:id', financeController.removePayment);

router.get('/transactions', financeController.listTransactions);
router.post('/transactions', uploadFinanceJustificatif, financeController.createTransaction);
router.put('/transactions/:id', uploadFinanceJustificatif, financeController.updateTransaction);
router.delete('/transactions/:id', financeController.removeTransaction);
router.get('/transactions/:id/logs', financeController.transactionLogs);

router.get('/report', financeController.getReport);
router.get('/report/export.csv', financeController.exportCsv);

module.exports = router;
