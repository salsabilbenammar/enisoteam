const trainingModel = require('../models/trainingModel');
const regModel = require('../models/activityRegistrationModel');
const { isClubMember, filterTrainingForPublic } = require('../middlewares/authMiddleware');

const niveaux = new Set(['debutant', 'intermediaire', 'avance']);

function parseOpen(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function parsePayante(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function formatTraining(row, req) {
  if (!row) return null;
  if (isClubMember(req.user)) return row;
  return filterTrainingForPublic(row);
}

function parseJsonBody(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function validateCustomAnswers(answersIn, fields) {
  const reponses_personnalisees = {};
  for (const field of fields || []) {
    const raw = answersIn[field.id];
    if (field.type === 'checkbox') {
      const checked =
        raw === true || raw === 1 || raw === '1' || raw === 'true' || raw === 'on';
      if (field.required && !checked) {
        return { error: `Please complete: ${field.label}` };
      }
      reponses_personnalisees[field.id] = checked;
      continue;
    }
    if (field.type === 'multiselect') {
      let values = [];
      if (Array.isArray(raw)) values = raw.map((v) => String(v).trim()).filter(Boolean);
      else if (typeof raw === 'string' && raw.trim()) {
        values = raw.split(',').map((v) => v.trim()).filter(Boolean);
      }
      if (field.required && !values.length) {
        return { error: `Please complete: ${field.label}` };
      }
      if (field.options?.length) {
        for (const v of values) {
          if (!field.options.includes(v)) {
            return { error: `Invalid value for: ${field.label}` };
          }
        }
      }
      reponses_personnalisees[field.id] = values;
      continue;
    }
    const value = raw == null ? '' : String(raw).trim();
    if (field.required && !value) {
      return { error: `Please complete: ${field.label}` };
    }
    if (field.type === 'select' && value && field.options?.length && !field.options.includes(value)) {
      return { error: `Invalid value for: ${field.label}` };
    }
    reponses_personnalisees[field.id] = value;
  }
  return { reponses_personnalisees };
}

function validateRegistration(body, training) {
  const { prenom, nom, email, telephone, filiere, annee, accepte_paiement } = body;
  if (!prenom || !nom || !email || !telephone) {
    return { error: 'Please fill in all required fields.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    return { error: 'Invalid email address.' };
  }
  const willing =
    accepte_paiement === true ||
    accepte_paiement === 1 ||
    accepte_paiement === '1' ||
    accepte_paiement === 'true' ||
    accepte_paiement === 'on';
  if (training.payante && !willing) {
    return {
      error: 'You must confirm that you are willing to pay for this training.',
    };
  }
  const answersIn = parseJsonBody(body.reponses_personnalisees, {});
  const custom = validateCustomAnswers(answersIn, training.champs_personnalises);
  if (custom.error) return { error: custom.error };

  return {
    data: {
      prenom: String(prenom).trim(),
      nom: String(nom).trim(),
      email: String(email).trim().toLowerCase(),
      telephone: String(telephone).trim(),
      facebook_link: null,
      filiere: filiere ? String(filiere).trim() : null,
      annee: annee ? String(annee).trim() : null,
      motivation: null,
      accepte_paiement: training.payante ? willing : false,
      reponses_personnalisees: custom.reponses_personnalisees,
    },
  };
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
    const {
      titre,
      description,
      date,
      formateur,
      niveau,
      lien,
      inscription_ouverte,
      payante,
      prix,
      fifo_paiement,
      champs_personnalises,
    } = req.body;
    if (!titre || !description || !date) {
      return res.status(400).json({ message: 'Titre, description et date requis.' });
    }
    if (niveau && !niveaux.has(niveau)) {
      return res.status(400).json({ message: 'Niveau invalide.' });
    }
    const isPayante = parsePayante(payante);
    if (isPayante && !String(prix || '').trim()) {
      return res.status(400).json({ message: 'Indiquez le montant pour une formation payante.' });
    }
    const image = req.file ? `/uploads/trainings/${req.file.filename}` : null;
    const row = await trainingModel.create({
      titre,
      description,
      date,
      formateur,
      niveau,
      lien,
      image,
      inscription_ouverte: parseOpen(inscription_ouverte),
      payante: isPayante,
      prix,
      fifo_paiement: isPayante && parseOpen(fifo_paiement),
      champs_personnalises: parseJsonBody(champs_personnalises, []),
    });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const {
      titre,
      description,
      date,
      formateur,
      niveau,
      lien,
      inscription_ouverte,
      payante,
      prix,
      fifo_paiement,
      champs_personnalises,
    } = req.body;
    if (!titre || !description || !date) {
      return res.status(400).json({ message: 'Titre, description et date requis.' });
    }
    if (niveau && !niveaux.has(niveau)) {
      return res.status(400).json({ message: 'Niveau invalide.' });
    }
    const isPayante = parsePayante(payante);
    if (isPayante && !String(prix || '').trim()) {
      return res.status(400).json({ message: 'Indiquez le montant pour une formation payante.' });
    }
    const payload = {
      titre,
      description,
      date,
      formateur,
      niveau,
      lien,
      inscription_ouverte: parseOpen(inscription_ouverte),
      payante: isPayante,
      prix,
      fifo_paiement: isPayante && parseOpen(fifo_paiement),
      champs_personnalises: parseJsonBody(champs_personnalises, []),
    };
    if (req.file) payload.image = `/uploads/trainings/${req.file.filename}`;
    const row = await trainingModel.update(req.params.id, payload);
    if (!row) return res.status(404).json({ message: 'Formation introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function setInscriptionOpen(req, res, next) {
  try {
    const open = parseOpen(req.body.inscription_ouverte);
    const row = await trainingModel.setInscriptionOpen(req.params.id, open);
    if (!row) return res.status(404).json({ message: 'Formation introuvable.' });
    res.json(row);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const training = await trainingModel.getById(req.params.id);
    if (!training) return res.status(404).json({ message: 'Training not found.' });
    if (!training.inscription_ouverte) {
      return res.status(403).json({ message: 'Registration is closed for this training.' });
    }
    const checked = validateRegistration(req.body, training);
    if (checked.error) return res.status(400).json({ message: checked.error });
    const id = await regModel.createTrainingRegistration(training.id, checked.data);
    res.status(201).json({ message: 'Registration submitted successfully.', id });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({
        message: 'Tables absentes. Exécutez database/update_activity_inscriptions.sql',
      });
    }
    next(err);
  }
}

async function listRegistrations(req, res, next) {
  try {
    const training = await trainingModel.getById(req.params.id);
    if (!training) return res.status(404).json({ message: 'Formation introuvable.' });
    res.json(await regModel.listTrainingRegistrations(training.id));
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') return res.json([]);
    next(err);
  }
}

async function setRegistrationPayment(req, res, next) {
  try {
    const training = await trainingModel.getById(req.params.id);
    if (!training) return res.status(404).json({ message: 'Formation introuvable.' });
    if (!training.payante) {
      return res.status(400).json({ message: 'Cette formation n’est pas payante.' });
    }
    const validated =
      req.body.paiement_valide === true ||
      req.body.paiement_valide === 1 ||
      req.body.paiement_valide === '1' ||
      req.body.paiement_valide === 'true';
    const row = await regModel.setTrainingRegistrationPayment(
      req.params.registrationId,
      training.id,
      validated
    );
    if (!row) return res.status(404).json({ message: 'Inscription introuvable.' });
    res.json(row);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
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

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  setInscriptionOpen,
  register,
  listRegistrations,
  setRegistrationPayment,
};
