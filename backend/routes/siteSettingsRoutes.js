const express = require('express');
const siteSettingsController = require('../controllers/siteSettingsController');
const { requireAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', siteSettingsController.get);
router.put('/', requireAdmin, siteSettingsController.update);

module.exports = router;
