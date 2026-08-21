const pvReunionModel = require('../models/pvReunionModel');

async function getAll(_req, res, next) {
  try {
    res.json(await pvReunionModel.getAll());
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') return res.json([]);
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const row = await pvReunionModel.getById(req.params.id);
    if (!row) return res.status(404).json({ message: 'PV introuvable.' });
    res.json(row);
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(404).json({ message: 'PV introuvable.' });
    }
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { titre, date_reunion, contenu } = req.body;
    if (!titre || !date_reunion) {
      return res.status(400).json({ message: 'Titre et date de réunion requis.' });
    }
    const fichier = req.file ? `/uploads/pv-reunions/${req.file.filename}` : null;
    const row = await pvReunionModel.create({
      titre: String(titre).trim(),
      date_reunion,
      contenu,
      fichier,
    });
    res.status(201).json(row);
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({
        message: 'Table absente. Exécutez database/migrate_pv_reunions.js',
      });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { titre, date_reunion, contenu } = req.body;
    if (!titre || !date_reunion) {
      return res.status(400).json({ message: 'Titre et date de réunion requis.' });
    }
    const data = {
      titre: String(titre).trim(),
      date_reunion,
      contenu,
    };
    if (req.file) data.fichier = `/uploads/pv-reunions/${req.file.filename}`;
    const row = await pvReunionModel.update(req.params.id, data);
    if (!row) return res.status(404).json({ message: 'PV introuvable.' });
    res.json(row);
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({
        message: 'Table absente. Exécutez database/migrate_pv_reunions.js',
      });
    }
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const ok = await pvReunionModel.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: 'PV introuvable.' });
    res.json({ message: 'PV supprimé.' });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(404).json({ message: 'PV introuvable.' });
    }
    next(err);
  }
}

module.exports = { getAll, getById, create, update, remove };
