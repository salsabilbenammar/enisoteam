const meritModel = require('../models/meritModel');
const rhFormModel = require('../models/rhFormModel');
const memberModel = require('../models/memberModel');

function missingTable(err) {
  return err.code === 'ER_NO_SUCH_TABLE';
}

function tableHint() {
  return 'Tables Coin RH absentes. Exécutez database/update_rh_corner.sql dans phpMyAdmin.';
}

/* ─── Mérites ─── */

async function getMyMerits(req, res, next) {
  try {
    if (req.user.role === 'admin') {
      return res.json({ total_points: 0, entries: [], admin: true });
    }
    res.json(await meritModel.getByMember(req.user.id));
  } catch (err) {
    if (missingTable(err)) return res.status(503).json({ message: tableHint() });
    next(err);
  }
}

async function getLeaderboard(_req, res, next) {
  try {
    res.json(await meritModel.getLeaderboard());
  } catch (err) {
    if (missingTable(err)) return res.status(503).json({ message: tableHint() });
    next(err);
  }
}

async function getAllMerits(_req, res, next) {
  try {
    res.json(await meritModel.getAll());
  } catch (err) {
    if (missingTable(err)) return res.status(503).json({ message: tableHint() });
    next(err);
  }
}

async function createMerit(req, res, next) {
  try {
    const member_id = Number(req.body.member_id);
    const points = Number(req.body.points);
    const motif = String(req.body.motif || '').trim();
    if (!member_id || !motif) {
      return res.status(400).json({ message: 'Membre et motif requis.' });
    }
    if (!Number.isFinite(points) || points === 0) {
      return res.status(400).json({ message: 'Nombre de points invalide.' });
    }
    const member = await memberModel.findById(member_id);
    if (!member) return res.status(404).json({ message: 'Membre introuvable.' });
    const row = await meritModel.create({ member_id, points, motif });
    res.status(201).json(row);
  } catch (err) {
    if (missingTable(err)) return res.status(503).json({ message: tableHint() });
    next(err);
  }
}

async function removeMerit(req, res, next) {
  try {
    const ok = await meritModel.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Entrée introuvable.' });
    res.json({ message: 'Mérite supprimé.' });
  } catch (err) {
    if (missingTable(err)) return res.status(503).json({ message: tableHint() });
    next(err);
  }
}

/* ─── Formulaires anonymes ─── */

async function createReport(req, res, next) {
  try {
    const sujet = String(req.body.sujet || '').trim();
    const message = String(req.body.message || '').trim();
    if (!sujet || !message) {
      return res.status(400).json({ message: 'Sujet et message requis.' });
    }
    const row = await rhFormModel.createReport({ sujet, message });
    res.status(201).json({ id: row.id, message: 'Signalement envoyé anonymement. Merci.' });
  } catch (err) {
    if (missingTable(err)) return res.status(503).json({ message: tableHint() });
    next(err);
  }
}

async function createSuggestion(req, res, next) {
  try {
    const titre = String(req.body.titre || '').trim();
    const message = String(req.body.message || '').trim();
    if (!titre || !message) {
      return res.status(400).json({ message: 'Titre et description requis.' });
    }
    if (req.user.role === 'admin') {
      return res.status(403).json({
        message: 'Connectez-vous avec un compte membre pour envoyer une suggestion.',
      });
    }
    const row = await rhFormModel.createSuggestion({
      titre,
      message,
      member_id: req.user.id,
      member_nom: req.user.nom,
      member_email: req.user.email,
    });
    res.status(201).json({ id: row.id, message: 'Suggestion envoyée. Merci !' });
  } catch (err) {
    if (missingTable(err)) return res.status(503).json({ message: tableHint() });
    next(err);
  }
}

async function createTrainingRequest(req, res, next) {
  try {
    const theme = String(req.body.theme || '').trim();
    const message = String(req.body.message || '').trim();
    const niveau = String(req.body.niveau || '').trim();
    if (!theme || !message) {
      return res.status(400).json({ message: 'Thème et description requis.' });
    }
    const row = await rhFormModel.createTrainingRequest({ theme, message, niveau });
    res.status(201).json({ id: row.id, message: 'Demande de formation envoyée. Merci.' });
  } catch (err) {
    if (missingTable(err)) return res.status(503).json({ message: tableHint() });
    next(err);
  }
}

async function listForms(req, res, next) {
  try {
    const type = req.params.type;
    res.json(await rhFormModel.getAll(type));
  } catch (err) {
    if (err.message === 'Type de formulaire invalide.') {
      return res.status(400).json({ message: err.message });
    }
    if (missingTable(err)) return res.status(503).json({ message: tableHint() });
    next(err);
  }
}

async function updateFormStatus(req, res, next) {
  try {
    const row = await rhFormModel.updateStatus(req.params.type, req.params.id, req.body.statut);
    if (!row) return res.status(404).json({ message: 'Entrée introuvable.' });
    res.json(row);
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ message: err.message });
    if (err.message === 'Type de formulaire invalide.') {
      return res.status(400).json({ message: err.message });
    }
    if (missingTable(err)) return res.status(503).json({ message: tableHint() });
    next(err);
  }
}

async function removeForm(req, res, next) {
  try {
    const ok = await rhFormModel.remove(req.params.type, req.params.id);
    if (!ok) return res.status(404).json({ message: 'Entrée introuvable.' });
    res.json({ message: 'Supprimé.' });
  } catch (err) {
    if (err.message === 'Type de formulaire invalide.') {
      return res.status(400).json({ message: err.message });
    }
    if (missingTable(err)) return res.status(503).json({ message: tableHint() });
    next(err);
  }
}

module.exports = {
  getMyMerits,
  getLeaderboard,
  getAllMerits,
  createMerit,
  removeMerit,
  createReport,
  createSuggestion,
  createTrainingRequest,
  listForms,
  updateFormStatus,
  removeForm,
};
