const attendanceModel = require('../models/attendanceModel');
const meritService = require('../services/meritService');

const ALLOWED_TYPES = new Set(['reunion', 'assemblee_generale', 'formation']);

function publicSessionView(session) {
  return {
    id: session.id,
    type: session.type,
    titre: session.titre,
    date_seance: session.date_seance,
    heure: session.heure,
    lieu: session.lieu,
    ouverte: !!session.ouverte,
  };
}

async function getAll(_req, res, next) {
  try {
    res.json(await attendanceModel.getAll());
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') return res.json([]);
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const row = await attendanceModel.getById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Séance introuvable.' });
    const entries = await attendanceModel.listEntries(row.id);
    res.json({ ...row, entries });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(404).json({ message: 'Séance introuvable.' });
    }
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { titre, type, date_seance, heure, lieu } = req.body;
    if (!titre || !String(titre).trim()) {
      return res.status(400).json({ message: 'Titre requis.' });
    }
    const sessionType = ALLOWED_TYPES.has(type) ? type : 'reunion';
    const row = await attendanceModel.create({
      type: sessionType,
      titre: String(titre).trim(),
      date_seance: date_seance || null,
      heure,
      lieu,
    });
    res.status(201).json(row);
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({
        message: 'Tables de présence absentes. Exécutez: node database/migrate_attendance.js',
      });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const existing = await attendanceModel.getById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Séance introuvable.' });
    const { titre, type, date_seance, heure, lieu, ouverte } = req.body;
    const payload = {};
    if (titre !== undefined) payload.titre = String(titre).trim();
    if (type !== undefined && ALLOWED_TYPES.has(type)) payload.type = type;
    if (date_seance !== undefined) payload.date_seance = date_seance;
    if (heure !== undefined) payload.heure = heure;
    if (lieu !== undefined) payload.lieu = lieu;
    if (ouverte !== undefined) payload.ouverte = !!ouverte;
    const row = await attendanceModel.update(req.params.id, payload);
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const ok = await attendanceModel.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Séance introuvable.' });
    res.json({ message: 'Séance supprimée.' });
  } catch (err) {
    next(err);
  }
}

async function addEntryAdmin(req, res, next) {
  try {
    const session = await attendanceModel.getById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Séance introuvable.' });
    const prenom = String(req.body.prenom || '').trim();
    const nom = String(req.body.nom || '').trim();
    if (!prenom || !nom) {
      return res.status(400).json({ message: 'Prénom et nom requis.' });
    }
    const entry = await attendanceModel.addEntry(session.id, { prenom, nom });
    try {
      await meritService.awardAttendanceEntry(session, entry);
    } catch (meritErr) {
      console.warn('[merit] award attendance failed:', meritErr.message);
    }
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
}

async function removeEntry(req, res, next) {
  try {
    const ok = await attendanceModel.removeEntry(req.params.entryId, req.params.id);
    if (!ok) return res.status(404).json({ message: 'Inscription introuvable.' });
    res.json({ message: 'Entrée supprimée.' });
  } catch (err) {
    next(err);
  }
}

async function getPublicSession(req, res, next) {
  try {
    const session = await attendanceModel.getByToken(req.params.token);
    if (!session) return res.status(404).json({ message: 'Séance introuvable.' });
    const entries = await attendanceModel.listEntries(session.id);
    res.json({
      ...publicSessionView(session),
      entries_count: entries.length,
      entries: entries.map((e) => ({
        id: e.id,
        prenom: e.prenom,
        nom: e.nom,
        created_at: e.created_at,
      })),
    });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(404).json({ message: 'Séance introuvable.' });
    }
    next(err);
  }
}

async function addEntryPublic(req, res, next) {
  try {
    const session = await attendanceModel.getByToken(req.params.token);
    if (!session) return res.status(404).json({ message: 'Séance introuvable.' });
    if (!session.ouverte) {
      return res.status(403).json({ message: 'La saisie est fermée pour cette séance.' });
    }
    const prenom = String(req.body.prenom || '').trim();
    const nom = String(req.body.nom || '').trim();
    if (!prenom || !nom) {
      return res.status(400).json({ message: 'Prénom et nom requis.' });
    }
    if (prenom.length > 120 || nom.length > 120) {
      return res.status(400).json({ message: 'Prénom ou nom trop long.' });
    }
    const entry = await attendanceModel.addEntry(session.id, { prenom, nom });
    try {
      await meritService.awardAttendanceEntry(session, entry);
    } catch (meritErr) {
      console.warn('[merit] award attendance failed:', meritErr.message);
    }
    res.status(201).json({
      id: entry.id,
      prenom: entry.prenom,
      nom: entry.nom,
      created_at: entry.created_at,
      message: 'Présence enregistrée. Merci !',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  addEntryAdmin,
  removeEntry,
  getPublicSession,
  addEntryPublic,
};
