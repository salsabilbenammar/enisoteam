const siteSettingsModel = require('../models/siteSettingsModel');

async function get(_req, res, next) {
  try {
    res.json(await siteSettingsModel.get());
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const current = await siteSettingsModel.get();
    const payload = {
      contact_label: req.body.contact_label ?? current.contact_label,
      contact_phone: req.body.contact_phone ?? current.contact_phone,
      instagram_url: req.body.instagram_url ?? current.instagram_url,
      facebook_url: req.body.facebook_url ?? current.facebook_url,
      linkedin_url: req.body.linkedin_url ?? current.linkedin_url,
      board_title: req.body.board_title ?? current.board_title,
      merit_rules: req.body.merit_rules ?? current.merit_rules,
      reglement_interne: req.body.reglement_interne ?? current.reglement_interne,
    };
    if (!payload.contact_label || !payload.contact_phone) {
      return res.status(400).json({ message: 'Le contact (libellé et téléphone) est requis.' });
    }
    const row = await siteSettingsModel.update(payload);
    res.json(row);
  } catch (err) {
    next(err);
  }
}

module.exports = { get, update };
