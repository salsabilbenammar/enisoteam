const clubInfoModel = require('../models/clubInfoModel');

async function getAll(_req, res, next) {
  try {
    const rows = await clubInfoModel.getAll();
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const row = await clubInfoModel.getById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Section introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { titre, contenu } = req.body;
    if (!titre || !contenu) {
      return res.status(400).json({ message: 'Titre et contenu requis.' });
    }
    const image = req.file ? `/uploads/club/${req.file.filename}` : null;
    const row = await clubInfoModel.create({ titre, contenu, image });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { titre, contenu } = req.body;
    if (!titre || !contenu) {
      return res.status(400).json({ message: 'Titre et contenu requis.' });
    }
    const data = { titre, contenu };
    if (req.file) data.image = `/uploads/club/${req.file.filename}`;
    const row = await clubInfoModel.update(req.params.id, data);
    if (!row) return res.status(404).json({ message: 'Section introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const ok = await clubInfoModel.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Section introuvable.' });
    res.json({ message: 'Section supprimée.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, create, update, remove };
