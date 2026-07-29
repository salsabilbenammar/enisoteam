const trainingModel = require('../models/trainingModel');
const { isClubMember, filterTrainingForPublic } = require('../middlewares/authMiddleware');

const niveaux = new Set(['debutant', 'intermediaire', 'avance']);

function formatTraining(row, req) {
  if (!row) return null;
  if (isClubMember(req.user)) return row;
  return filterTrainingForPublic(row);
}

async function getAll(req, res, next) {
  try {
    const rows = await trainingModel.getAll();
    res.json(rows.map((row) => formatTraining(row, req)));
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const row = await trainingModel.getById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Formation introuvable.' });
    res.json(formatTraining(row, req));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { titre, description, date, formateur, niveau, lien } = req.body;
    if (!titre || !description || !date) {
      return res.status(400).json({ message: 'Titre, description et date requis.' });
    }
    if (niveau && !niveaux.has(niveau)) {
      return res.status(400).json({ message: 'Niveau invalide.' });
    }
    const row = await trainingModel.create({ titre, description, date, formateur, niveau, lien });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { titre, description, date, formateur, niveau, lien } = req.body;
    if (!titre || !description || !date) {
      return res.status(400).json({ message: 'Titre, description et date requis.' });
    }
    if (niveau && !niveaux.has(niveau)) {
      return res.status(400).json({ message: 'Niveau invalide.' });
    }
    const row = await trainingModel.update(req.params.id, {
      titre,
      description,
      date,
      formateur,
      niveau,
      lien,
    });
    if (!row) return res.status(404).json({ message: 'Formation introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const ok = await trainingModel.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Formation introuvable.' });
    res.json({ message: 'Formation supprimée.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, create, update, remove };
