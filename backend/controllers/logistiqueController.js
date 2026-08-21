const logistiqueModel = require('../models/logistiqueModel');

function tableMissing(err) {
  return err.code === 'ER_NO_SUCH_TABLE';
}

async function getAll(req, res, next) {
  try {
    res.json(
      await logistiqueModel.getAll({
        search: req.query.search || '',
        etat: req.query.etat || '',
        categorie: req.query.categorie || '',
      })
    );
  } catch (err) {
    if (tableMissing(err)) return res.json([]);
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const row = await logistiqueModel.getById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Matériel introuvable.' });
    res.json(row);
  } catch (err) {
    if (tableMissing(err)) {
      return res.status(404).json({ message: 'Matériel introuvable.' });
    }
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { nom } = req.body;
    if (!nom || !String(nom).trim()) {
      return res.status(400).json({ message: 'Le nom du matériel est requis.' });
    }
    const row = await logistiqueModel.create(req.body);
    res.status(201).json(row);
  } catch (err) {
    if (tableMissing(err)) {
      return res.status(503).json({
        message: 'Table absente. Exécutez database/migrate_logistique.js',
      });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { nom } = req.body;
    if (!nom || !String(nom).trim()) {
      return res.status(400).json({ message: 'Le nom du matériel est requis.' });
    }
    const row = await logistiqueModel.update(req.params.id, req.body);
    if (!row) return res.status(404).json({ message: 'Matériel introuvable.' });
    res.json(row);
  } catch (err) {
    if (tableMissing(err)) {
      return res.status(503).json({
        message: 'Table absente. Exécutez database/migrate_logistique.js',
      });
    }
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const ok = await logistiqueModel.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Matériel introuvable.' });
    res.json({ message: 'Matériel supprimé.' });
  } catch (err) {
    if (tableMissing(err)) {
      return res.status(404).json({ message: 'Matériel introuvable.' });
    }
    next(err);
  }
}

async function listEmprunts(req, res, next) {
  try {
    res.json(
      await logistiqueModel.listEmprunts({
        statut: req.query.statut || '',
        materiel_id: req.query.materiel_id || '',
        search: req.query.search || '',
      })
    );
  } catch (err) {
    if (tableMissing(err)) return res.json([]);
    next(err);
  }
}

async function createEmprunt(req, res, next) {
  try {
    const row = await logistiqueModel.createEmprunt(req.body);
    res.status(201).json(row);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    if (tableMissing(err)) {
      return res.status(503).json({
        message: 'Table absente. Exécutez database/migrate_logistique_emprunts.js',
      });
    }
    next(err);
  }
}

async function returnEmprunt(req, res, next) {
  try {
    const row = await logistiqueModel.returnEmprunt(req.params.id, req.body || {});
    res.json(row);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    if (tableMissing(err)) {
      return res.status(404).json({ message: 'Emprunt introuvable.' });
    }
    next(err);
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  listEmprunts,
  createEmprunt,
  returnEmprunt,
};
