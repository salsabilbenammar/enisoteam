const deplacementModel = require('../models/deplacementModel');
const { normalizeCustomFields } = require('../models/activityRegistrationModel');
const meritService = require('../services/meritService');

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

function validateCustomAnswers(fields, answersIn) {
  const answers = parseJsonBody(answersIn, {});
  const cleaned = {};
  for (const field of fields) {
    const raw = answers[field.id];
    if (field.required) {
      if (field.type === 'checkbox' && raw !== true && raw !== 'true' && raw !== 1) {
        return { error: `Merci de compléter : ${field.label}` };
      }
      if (field.type === 'multiselect' && (!Array.isArray(raw) || !raw.length)) {
        return { error: `Merci de compléter : ${field.label}` };
      }
      if (
        field.type !== 'checkbox' &&
        field.type !== 'multiselect' &&
        (raw == null || String(raw).trim() === '')
      ) {
        return { error: `Merci de compléter : ${field.label}` };
      }
    }
    if (raw !== undefined) cleaned[field.id] = raw;
  }
  return { cleaned };
}

function validateRegistration(body, deplacement) {
  const { prenom, nom, email, telephone, filiere, annee, role_candidat } = body;
  if (!prenom || !nom || !email || !telephone) {
    return { error: 'Prénom, nom, email et téléphone sont requis.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    return { error: 'Adresse email invalide.' };
  }
  if (role_candidat !== 'spectateur' && role_candidat !== 'competiteur') {
    return { error: 'Choisissez spectateur ou compétiteur.' };
  }

  const willing =
    body.accepte_paiement === true ||
    body.accepte_paiement === 1 ||
    body.accepte_paiement === '1' ||
    body.accepte_paiement === 'true' ||
    body.accepte_paiement === 'on';
  if (deplacement.payant && !willing) {
    return { error: 'Vous devez accepter le paiement pour ce déplacement.' };
  }

  const common = validateCustomAnswers(
    normalizeCustomFields(deplacement.champs_personnalises),
    body.reponses_personnalisees
  );
  if (common.error) return common;

  let competitorAnswers = {};
  if (role_candidat === 'competiteur') {
    const competitorFields = deplacementModel.resolveCompetitorFields(deplacement);
    const competitor = validateCustomAnswers(
      competitorFields,
      body.reponses_competiteur || body.reponses_personnalisees
    );
    if (competitor.error) return competitor;
    competitorAnswers = competitor.cleaned;

    const teamSize = Number(competitorAnswers.comp_nombre_membres);
    if (!Number.isInteger(teamSize) || teamSize < 1 || teamSize > 4) {
      return { error: 'Choisissez un nombre de membres entre 1 et 4.' };
    }
    if (!String(competitorAnswers.comp_nom_robot || '').trim()) {
      return { error: 'Le nom du robot est requis.' };
    }
    for (let member = 2; member <= teamSize; member += 1) {
      const required = ['prenom', 'nom', 'email', 'telephone', 'filiere'];
      const incomplete = required.some(
        (key) => !String(competitorAnswers[`membre_${member}_${key}`] || '').trim()
      );
      if (incomplete) {
        return {
          error: `Complétez les informations du ${member}ème membre de l’équipe.`,
        };
      }
      const memberEmail = String(competitorAnswers[`membre_${member}_email`]).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberEmail)) {
        return { error: `Email invalide pour le ${member}ème membre.` };
      }
    }
  }

  return {
    data: {
      prenom: String(prenom).trim(),
      nom: String(nom).trim(),
      email: String(email).trim().toLowerCase(),
      telephone: String(telephone).trim(),
      filiere: filiere ? String(filiere).trim() : null,
      annee: annee ? String(annee).trim() : null,
      role_candidat,
      motivation: body.motivation ? String(body.motivation).trim() : null,
      accepte_paiement: deplacement.payant ? !!willing : false,
      reponses_personnalisees: { ...common.cleaned, ...competitorAnswers },
      member_id: body.member_id || null,
    },
  };
}

async function getAll(req, res, next) {
  try {
    const all = await deplacementModel.getAll();
    const isBureau =
      req.user?.role === 'admin' || req.user?.role === 'secretaire';
    if (isBureau) {
      return res.json(all);
    }
    // Site officiel : uniquement les inscriptions ouvertes
    res.json(all.filter((d) => d.inscription_ouverte));
  } catch (err) {
    next(err);
  }
}

async function getOpen(_req, res, next) {
  try {
    res.json(await deplacementModel.getOpen());
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const row = await deplacementModel.getById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Déplacement introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const {
      titre,
      description,
      destination,
      competition,
      date_competition,
      prix,
      payant,
      inscription_ouverte,
      places_max,
    } = req.body;
    if (!titre || !description) {
      return res.status(400).json({ message: 'Titre et description requis.' });
    }
    const isPayant = parseOpen(payant);
    if (isPayant && !String(prix || '').trim()) {
      return res.status(400).json({ message: 'Indiquez le montant pour un déplacement payant.' });
    }
    const places = deplacementModel.parsePlacesMax(places_max);
    if (places_max != null && places_max !== '' && !places) {
      return res.status(400).json({ message: 'Nombre de places invalide (minimum 1).' });
    }
    const affiche_url = req.file
      ? `/uploads/deplacements/${req.file.filename}`
      : null;
    const row = await deplacementModel.create({
      titre,
      description,
      destination,
      competition,
      affiche_url,
      date_competition,
      prix,
      payant: isPayant,
      inscription_ouverte: parseOpen(inscription_ouverte),
      places_max: places,
      champs_personnalises: [],
      champs_competiteur: [],
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
      destination,
      competition,
      date_competition,
      prix,
      payant,
      inscription_ouverte,
      places_max,
    } = req.body;
    if (!titre || !description) {
      return res.status(400).json({ message: 'Titre et description requis.' });
    }
    const isPayant = parseOpen(payant);
    if (isPayant && !String(prix || '').trim()) {
      return res.status(400).json({ message: 'Indiquez le montant pour un déplacement payant.' });
    }
    const places = deplacementModel.parsePlacesMax(places_max);
    if (places_max != null && places_max !== '' && !places) {
      return res.status(400).json({ message: 'Nombre de places invalide (minimum 1).' });
    }
    const updates = {
      titre,
      description,
      destination,
      competition,
      date_competition,
      prix,
      payant: isPayant,
      inscription_ouverte: parseOpen(inscription_ouverte),
      places_max: places,
      champs_personnalises: [],
      champs_competiteur: [],
    };
    if (req.file) {
      updates.affiche_url = `/uploads/deplacements/${req.file.filename}`;
    }
    const row = await deplacementModel.update(req.params.id, updates);
    if (!row) return res.status(404).json({ message: 'Déplacement introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function setInscriptionOpen(req, res, next) {
  try {
    const row = await deplacementModel.setInscriptionOpen(
      req.params.id,
      parseOpen(req.body.inscription_ouverte)
    );
    if (!row) return res.status(404).json({ message: 'Déplacement introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const ok = await deplacementModel.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Déplacement introuvable.' });
    res.json({ message: 'Déplacement supprimé.' });
  } catch (err) {
    next(err);
  }
}

async function listRegistrations(req, res, next) {
  try {
    const trip = await deplacementModel.getById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Déplacement introuvable.' });
    res.json(await deplacementModel.listRegistrations(trip.id));
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const trip = await deplacementModel.getById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Déplacement introuvable.' });
    if (!trip.inscription_ouverte) {
      return res.status(403).json({ message: 'Les inscriptions sont fermées.' });
    }
    if (trip.complet) {
      return res.status(409).json({ message: 'Ce déplacement est complet.' });
    }
    const body = {
      ...req.body,
      member_id: req.user?.role === 'member' ? req.user.id : req.body.member_id,
    };
    const checked = validateRegistration(body, trip);
    if (checked.error) return res.status(400).json({ message: checked.error });
    const id = await deplacementModel.createRegistration(trip.id, checked.data);
    res.status(201).json({ message: 'Inscription enregistrée.', id });
  } catch (err) {
    next(err);
  }
}

async function setRegistrationPayment(req, res, next) {
  try {
    const trip = await deplacementModel.getById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Déplacement introuvable.' });
    if (!trip.payant) {
      return res.status(400).json({ message: 'Ce déplacement n’est pas payant.' });
    }
    const validated =
      req.body.paiement_valide === true ||
      req.body.paiement_valide === 1 ||
      req.body.paiement_valide === '1' ||
      req.body.paiement_valide === 'true';
    const row = await deplacementModel.setRegistrationPayment(
      req.params.registrationId,
      trip.id,
      validated
    );
    if (!row) return res.status(404).json({ message: 'Inscription introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function saveListeFinale(req, res, next) {
  try {
    const trip = await deplacementModel.getById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Déplacement introuvable.' });
    const personnes = Array.isArray(req.body.personnes) ? req.body.personnes : null;
    if (!personnes || !personnes.length) {
      return res.status(400).json({
        message: 'La liste finale est vide. Ajoutez au moins une personne avant d’enregistrer.',
      });
    }
    const row = await deplacementModel.saveListeFinale(trip.id, {
      personnes,
      spectator_ids: req.body.spectator_ids,
    });
    if (!row) return res.status(404).json({ message: 'Déplacement introuvable.' });

    let meritAwarded = 0;
    try {
      const regs = await deplacementModel.listRegistrations(trip.id);
      const merit = await meritService.awardDeplacementListeFinale(
        row,
        row.liste_finale,
        regs
      );
      meritAwarded = merit.awarded || 0;
    } catch (meritErr) {
      console.warn('[merit] deplacement liste finale:', meritErr.message);
    }

    res.json({
      message:
        meritAwarded > 0
          ? `Liste finale enregistrée. ${meritAwarded} point(s) mérite attribué(s).`
          : 'Liste finale enregistrée.',
      liste_finale: row.liste_finale,
      liste_finale_at: row.liste_finale_at,
      merit_awarded: meritAwarded,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getOpen,
  getById,
  create,
  update,
  setInscriptionOpen,
  remove,
  listRegistrations,
  register,
  setRegistrationPayment,
  saveListeFinale,
};
