const boardModel = require('../models/boardModel');

async function getAll(_req, res, next) {
  try {
    res.json(await boardModel.getAll());
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const row = await boardModel.getById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Membre introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { nom, poste, description, email, telephone, facebook, ordre_affichage } = req.body;
    if (!nom || !poste) {
      return res.status(400).json({ message: 'Nom et poste requis.' });
    }
    const photo = req.file ? `/uploads/board/${req.file.filename}` : null;
    const row = await boardModel.create({
      nom,
      poste,
      description,
      email,
      telephone,
      facebook,
      ordre_affichage: ordre_affichage ? Number(ordre_affichage) : 0,
      photo,
    });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { nom, poste, description, email, telephone, facebook, ordre_affichage } = req.body;
    if (!nom || !poste) {
      return res.status(400).json({ message: 'Nom et poste requis.' });
    }
    const data = {
      nom,
      poste,
      description,
      email,
      telephone,
      facebook,
      ordre_affichage: ordre_affichage ? Number(ordre_affichage) : 0,
    };
    if (req.file) data.photo = `/uploads/board/${req.file.filename}`;
    const row = await boardModel.update(req.params.id, data);
    if (!row) return res.status(404).json({ message: 'Membre introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const ok = await boardModel.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Membre introuvable.' });
    res.json({ message: 'Membre supprimé.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, create, update, remove };
