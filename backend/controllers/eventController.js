const eventModel = require('../models/eventModel');
const regModel = require('../models/activityRegistrationModel');

const statuts = new Set(['a_venir', 'passe']);
const formTypes = new Set(['individuel', 'avec_accompagnants']);

function parseOpen(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
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

function extractFormConfig(body) {
  const formulaire_type = formTypes.has(body.formulaire_type)
    ? body.formulaire_type
    : 'individuel';
  return {
    formulaire_type,
    accompagnants_min: Number(body.accompagnants_min) || 0,
    accompagnants_max: Number(body.accompagnants_max) || 0,
    champs_personnalises: parseJsonBody(body.champs_personnalises, []),
  };
}

function validateRegistration(body, event) {
  const { prenom, nom, email, telephone, filiere, annee } = body;
  if (!prenom || !nom || !email || !telephone) {
    return { error: 'Please fill in all required fields.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    return { error: 'Invalid email address.' };
  }

  let accompagnants = parseJsonBody(body.accompagnants, []);
  if (!Array.isArray(accompagnants)) accompagnants = [];

  if (event.formulaire_type === 'avec_accompagnants') {
    const min = event.accompagnants_min || 0;
    const max = event.accompagnants_max || 0;
    if (accompagnants.length < min || accompagnants.length > max) {
      return {
        error: `Please add between ${min} and ${max} companion(s).`,
      };
    }
    for (const [i, c] of accompagnants.entries()) {
      if (!c?.prenom?.trim() || !c?.nom?.trim()) {
        return { error: `Companion #${i + 1}: first name and last name are required.` };
      }
    }
    accompagnants = accompagnants.map((c) => ({
      prenom: String(c.prenom).trim(),
      nom: String(c.nom).trim(),
    }));
  } else {
    accompagnants = [];
  }

  const answersIn = parseJsonBody(body.reponses_personnalisees, {});
  const reponses_personnalisees = {};
  for (const field of event.champs_personnalises || []) {
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
      accompagnants,
      reponses_personnalisees,
    },
  };
}

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
    const { titre, description, date, lieu, statut, inscription_ouverte } = req.body;
    if (!titre || !description || !date) {
      return res.status(400).json({ message: 'Titre, description et date requis.' });
    }
    if (statut && !statuts.has(statut)) {
      return res.status(400).json({ message: 'Statut invalide.' });
    }
    const image = req.file ? `/uploads/events/${req.file.filename}` : null;
    const form = extractFormConfig(req.body);
    if (form.formulaire_type === 'avec_accompagnants' && form.accompagnants_max < 1) {
      return res.status(400).json({
        message: 'Indiquez un nombre maximum d’accompagnants (≥ 1).',
      });
    }
    const row = await eventModel.create({
      titre,
      description,
      date,
      lieu,
      statut,
      image,
      inscription_ouverte: parseOpen(inscription_ouverte),
      ...form,
    });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { titre, description, date, lieu, statut, inscription_ouverte } = req.body;
    if (!titre || !description || !date) {
      return res.status(400).json({ message: 'Titre, description et date requis.' });
    }
    if (statut && !statuts.has(statut)) {
      return res.status(400).json({ message: 'Statut invalide.' });
    }
    const form = extractFormConfig(req.body);
    if (form.formulaire_type === 'avec_accompagnants' && form.accompagnants_max < 1) {
      return res.status(400).json({
        message: 'Indiquez un nombre maximum d’accompagnants (≥ 1).',
      });
    }
    const data = {
      titre,
      description,
      date,
      lieu,
      statut,
      inscription_ouverte: parseOpen(inscription_ouverte),
      ...form,
    };
    if (req.file) data.image = `/uploads/events/${req.file.filename}`;
    const row = await eventModel.update(req.params.id, data);
    if (!row) return res.status(404).json({ message: 'Événement introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function setInscriptionOpen(req, res, next) {
  try {
    const open = parseOpen(req.body.inscription_ouverte);
    const row = await eventModel.setInscriptionOpen(req.params.id, open);
    if (!row) return res.status(404).json({ message: 'Événement introuvable.' });
    res.json(row);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const event = await eventModel.getById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (!event.inscription_ouverte) {
      return res.status(403).json({ message: 'Registration is closed for this event.' });
    }
    const checked = validateRegistration(req.body, event);
    if (checked.error) return res.status(400).json({ message: checked.error });
    const id = await regModel.createEventRegistration(event.id, checked.data);
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
    const event = await eventModel.getById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Événement introuvable.' });
    res.json(await regModel.listEventRegistrations(event.id));
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') return res.json([]);
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

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  setInscriptionOpen,
  register,
  listRegistrations,
};
