const eventModel = require('../models/eventModel');

const statuts = new Set(['a_venir', 'passe']);

async function getAll(_req, res, next) {
  try {
    res.json(await eventModel.getAll());
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const row = await eventModel.getById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Événement introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { titre, description, date, lieu, statut } = req.body;
    if (!titre || !description || !date) {
      return res.status(400).json({ message: 'Titre, description et date requis.' });
    }
    if (statut && !statuts.has(statut)) {
      return res.status(400).json({ message: 'Statut invalide.' });
    }
    const image = req.file ? `/uploads/events/${req.file.filename}` : null;
    const row = await eventModel.create({ titre, description, date, lieu, statut, image });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { titre, description, date, lieu, statut } = req.body;
    if (!titre || !description || !date) {
      return res.status(400).json({ message: 'Titre, description et date requis.' });
    }
    if (statut && !statuts.has(statut)) {
      return res.status(400).json({ message: 'Statut invalide.' });
    }
    const data = { titre, description, date, lieu, statut };
    if (req.file) data.image = `/uploads/events/${req.file.filename}`;
    const row = await eventModel.update(req.params.id, data);
    if (!row) return res.status(404).json({ message: 'Événement introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const ok = await eventModel.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Événement introuvable.' });
    res.json({ message: 'Événement supprimé.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, create, update, remove };
