const prospectionModel = require('../models/prospectionModel');
const {
  canViewMembersContent,
  filterByAudience,
  normalizeAudience,
} = require('../middlewares/authMiddleware');

async function getStatus(req, res, next) {
  try {
    const total = await prospectionModel.countVisible(canViewMembersContent(req.user));
    res.json({ has_items: total > 0, total });
  } catch (err) {
    next(err);
  }
}

async function getAll(req, res, next) {
  try {
    const rows = await prospectionModel.getAll();
    res.json(filterByAudience(rows, req.user));
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const row = await prospectionModel.getById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Réalisation introuvable.' });
    if (row.audience === 'membres' && !canViewMembersContent(req.user)) {
      return res.status(403).json({
        message: 'Cette réalisation est réservée aux membres connectés.',
      });
    }
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { titre, description, annee, ordre_affichage, audience } = req.body;
    if (!titre?.trim()) {
      return res.status(400).json({ message: 'Le titre est requis.' });
    }
    const image = req.file ? `/uploads/prospection/${req.file.filename}` : null;
    const row = await prospectionModel.create({
      titre: titre.trim(),
      description,
      annee,
      image,
      ordre_affichage: ordre_affichage ? Number(ordre_affichage) : 0,
      audience: normalizeAudience(audience),
    });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { titre, description, annee, ordre_affichage, audience } = req.body;
    if (!titre?.trim()) {
      return res.status(400).json({ message: 'Le titre est requis.' });
    }
    const data = {
      titre: titre.trim(),
      description,
      annee,
      ordre_affichage: ordre_affichage ? Number(ordre_affichage) : 0,
      audience: normalizeAudience(audience),
    };
    if (req.file) {
      data.image = `/uploads/prospection/${req.file.filename}`;
    }
    const row = await prospectionModel.update(req.params.id, data);
    if (!row) return res.status(404).json({ message: 'Réalisation introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const ok = await prospectionModel.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Réalisation introuvable.' });
    res.json({ message: 'Réalisation supprimée.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getStatus, getAll, getById, create, update, remove };
