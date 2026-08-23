const express = require('express');
const siteSettingsController = require('../controllers/siteSettingsController');
const {
  requireAdmin,
  canWriteModule,
} = require('../middlewares/authMiddleware');

const router = express.Router();

const MEDIA_KEYS = new Set([
  'contact_label',
  'contact_phone',
  'instagram_url',
  'facebook_url',
  'linkedin_url',
  'tiktok_url',
  'youtube_url',
]);

const BOARD_KEYS = new Set(['board_title']);

const RH_KEYS = new Set(['merit_rules', 'reglement_interne']);

const TRESO_KEYS = new Set(['mail_paiement_sujet', 'mail_paiement_corps']);

function requireSiteSettingsWrite(req, res, next) {
  return requireAdmin(req, res, () => {
    const role = req.user?.role;
    if (role === 'admin') return next();

    const keys = Object.keys(req.body || {}).filter(
      (k) => req.body[k] !== undefined && req.body[k] !== null
    );
    if (!keys.length) {
      return res.status(400).json({ message: 'Aucune donnée à enregistrer.' });
    }

    const allowed = new Set();
    if (canWriteModule(role, 'contact')) {
      MEDIA_KEYS.forEach((k) => allowed.add(k));
    }
    if (canWriteModule(role, 'board')) {
      BOARD_KEYS.forEach((k) => allowed.add(k));
    }
    if (canWriteModule(role, 'rh')) {
      RH_KEYS.forEach((k) => allowed.add(k));
    }
    if (canWriteModule(role, 'finance')) {
      TRESO_KEYS.forEach((k) => allowed.add(k));
    }

    if (keys.every((k) => allowed.has(k))) return next();

    return res.status(403).json({
      message: 'Lecture seule : certains champs ne sont pas dans votre périmètre.',
    });
  });
}

router.get('/', siteSettingsController.get);
router.put('/', requireSiteSettingsWrite, siteSettingsController.update);

module.exports = router;
