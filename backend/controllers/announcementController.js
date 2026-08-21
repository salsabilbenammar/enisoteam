const announcementModel = require('../models/announcementModel');

const urlRegex = /^https?:\/\/.+/i;

function normalizeFormLink(link) {
  if (!link || !String(link).trim()) return null;
  const trimmed = String(link).trim();
  if (!urlRegex.test(trimmed)) {
    return { error: 'Lien du formulaire invalide (doit commencer par http:// ou https://).' };
  }
  return { value: trimmed };
}

async function getAll(_req, res, next) {
  try {
    res.json(await announcementModel.getAll());
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const row = await announcementModel.getById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Annonce introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { titre, contenu, date_publication, lien_formulaire, salle, heure } = req.body;
    if (!titre || !contenu || !date_publication) {
      return res.status(400).json({ message: 'Titre, contenu et date de publication requis.' });
    }
    const link = normalizeFormLink(lien_formulaire);
    if (link?.error) return res.status(400).json({ message: link.error });

    const image = req.file ? `/uploads/announcements/${req.file.filename}` : null;
    const row = await announcementModel.create({
      titre,
      contenu,
      date_publication,
      lien_formulaire: link?.value,
      salle,
      heure,
      image,
    });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { titre, contenu, date_publication, lien_formulaire, salle, heure } = req.body;
    if (!titre || !contenu || !date_publication) {
      return res.status(400).json({ message: 'Titre, contenu et date de publication requis.' });
    }
    const link = normalizeFormLink(lien_formulaire);
    if (link?.error) return res.status(400).json({ message: link.error });

    const data = {
      titre,
      contenu,
      date_publication,
      lien_formulaire: link?.value,
      salle,
      heure,
    };
    if (req.file) data.image = `/uploads/announcements/${req.file.filename}`;
    const row = await announcementModel.update(req.params.id, data);
    if (!row) return res.status(404).json({ message: 'Annonce introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const ok = await announcementModel.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Annonce introuvable.' });
    res.json({ message: 'Annonce supprimée.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, create, update, remove };
