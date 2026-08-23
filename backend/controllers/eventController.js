const eventModel = require('../models/eventModel');
const regModel = require('../models/activityRegistrationModel');
const { sendMail } = require('../services/emailService');
const { buildSelectionEmail } = require('../services/eventMailTemplates');
const {
  canViewMembersContent,
  filterByAudience,
  normalizeAudience,
  isClubMember,
} = require('../middlewares/authMiddleware');

const statuts = new Set(['a_venir', 'passe']);
const formTypes = new Set(['personne', 'groupe', 'les_deux', 'individuel', 'avec_accompagnants']);

function parseOpen(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function parsePayant(value) {
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'on';
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
  const rawType = formTypes.has(body.formulaire_type)
    ? body.formulaire_type
    : 'personne';
  const formulaire_type = regModel.normalizeFormAudience(rawType);
  return {
    formulaire_type,
    accompagnants_min: Number(body.accompagnants_min) || 0,
    accompagnants_max: Number(body.accompagnants_max) || 0,
    champs_chef: parseJsonBody(body.champs_chef, []),
    champs_membres: parseJsonBody(body.champs_membres, []),
    champs_communs: parseJsonBody(body.champs_communs, []),
    champs_personnalises: parseJsonBody(body.champs_personnalises, []),
  };
}

function collectAnswers(fields, answersIn, prefix = '') {
  const out = {};
  for (const field of fields || []) {
    const raw = answersIn[field.id];
    if (field.type === 'checkbox') {
      const checked =
        raw === true || raw === 1 || raw === '1' || raw === 'true' || raw === 'on';
      if (field.required && !checked) {
        return { error: `Veuillez compléter ${prefix}: ${field.label}` };
      }
      out[field.id] = checked;
      continue;
    }
    if (field.type === 'multiselect') {
      let values = [];
      if (Array.isArray(raw)) values = raw.map((v) => String(v).trim()).filter(Boolean);
      else if (typeof raw === 'string' && raw.trim()) {
        values = raw.split(',').map((v) => v.trim()).filter(Boolean);
      }
      if (field.required && !values.length) {
        return { error: `Veuillez compléter ${prefix}: ${field.label}` };
      }
      out[field.id] = values;
      continue;
    }
    const value = raw == null ? '' : String(raw).trim();
    if (field.required && !value) {
      return { error: `Veuillez compléter ${prefix}: ${field.label}` };
    }
    out[field.id] = value;
  }
  return { answers: out };
}

function validateRegistration(body, event) {
  const answersPreview = parseJsonBody(body.reponses_personnalisees, {});
  const prenom = body.prenom || answersPreview.prenom;
  const nom = body.nom || answersPreview.nom;
  const email = body.email || answersPreview.email;
  const telephone = body.telephone || answersPreview.telephone;
  const filiere = body.filiere || answersPreview.filiere;
  const annee = body.annee || answersPreview.annee;
  const custom = event.champs_personnalises || [];
  const telField = custom.find((f) => f.id === 'telephone');
  const needTel = !custom.length || !telField || telField.required;
  if (!prenom || !nom || !email || (needTel && !telephone)) {
    return { error: 'Veuillez remplir tous les champs obligatoires.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    return { error: 'Adresse email invalide.' };
  }

  const willing =
    body.accepte_paiement === true ||
    body.accepte_paiement === 1 ||
    body.accepte_paiement === '1' ||
    body.accepte_paiement === 'true' ||
    body.accepte_paiement === 'on';
  if (event.payant && !willing) {
    return {
      error: 'Vous devez confirmer accepter les frais d’inscription pour cet événement.',
    };
  }

  let accompagnants = parseJsonBody(body.accompagnants, []);
  if (!Array.isArray(accompagnants)) accompagnants = [];

  const answersInEarly = parseJsonBody(body.reponses_personnalisees, {});
  const inscriptionMode = String(
    body.mode_inscription || answersInEarly.mode_inscription || ''
  ).trim();
  const audience = regModel.normalizeFormAudience(event.formulaire_type);
  let isGroup = false;
  if (audience === 'groupe') {
    isGroup = true;
  } else if (audience === 'les_deux') {
    if (inscriptionMode !== 'personne' && inscriptionMode !== 'groupe') {
      return { error: 'Choisissez si vous vous inscrivez seul(e) ou en groupe.' };
    }
    isGroup = inscriptionMode === 'groupe';
  } else {
    isGroup = false;
  }

  if (isGroup) {
    const min = Math.max(1, Number(event.accompagnants_min) || 1);
    const max = Number(event.accompagnants_max) > 0 ? Number(event.accompagnants_max) : 10;
    if (accompagnants.length < min || accompagnants.length > max) {
      return {
        error: `Ajoutez entre ${min} et ${max} membre(s) du groupe (en plus de vous).`,
      };
    }
    const memberFields = [
      ...(event.champs_membres || []),
      ...(event.champs_communs || []),
    ];
    const cleanedMembers = [];
    for (const [i, c] of accompagnants.entries()) {
      if (!c?.prenom?.trim() || !c?.nom?.trim()) {
        return { error: `Membre du groupe #${i + 1} : prénom et nom obligatoires.` };
      }
      const memberAnswers = parseJsonBody(c.reponses, {});
      const checkedMember = collectAnswers(
        memberFields,
        memberAnswers,
        `pour le membre #${i + 1}`
      );
      if (checkedMember.error) return { error: checkedMember.error };
      cleanedMembers.push({
        prenom: String(c.prenom).trim(),
        nom: String(c.nom).trim(),
        reponses: checkedMember.answers,
      });
    }
    accompagnants = cleanedMembers;
  } else {
    accompagnants = [];
  }

  const answersIn = parseJsonBody(body.reponses_personnalisees, {});
  const chefFields = [
    ...(event.champs_chef || []),
    ...(event.champs_communs || []),
  ];
  if (!chefFields.length && event.champs_personnalises?.length) {
    chefFields.push(...event.champs_personnalises);
  }
  const chefChecked = collectAnswers(chefFields, answersIn, '');
  if (chefChecked.error) return { error: chefChecked.error.replace(' :', ':') };
  const reponses_personnalisees = chefChecked.answers;

  reponses_personnalisees.mode_inscription = isGroup ? 'groupe' : 'personne';

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
      accepte_paiement: event.payant ? willing : false,
      accompagnants,
      reponses_personnalisees,
    },
  };
}

async function getAll(req, res, next) {
  try {
    const rows = await eventModel.getAll();
    res.json(filterByAudience(rows, req.user));
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const row = await eventModel.getById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Événement introuvable.' });
    if (row.audience === 'membres' && !canViewMembersContent(req.user)) {
      return res.status(403).json({
        message: 'Cet événement est réservé aux membres connectés.',
      });
    }
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { titre, description, date, lieu, statut, inscription_ouverte, payant, prix, audience } =
      req.body;
    if (!titre || !description || !date) {
      return res.status(400).json({ message: 'Titre, description et date requis.' });
    }
    if (statut && !statuts.has(statut)) {
      return res.status(400).json({ message: 'Statut invalide.' });
    }
    const isPayant = parsePayant(payant);
    if (isPayant && !String(prix || '').trim()) {
      return res.status(400).json({ message: 'Indiquez le montant pour un événement payant.' });
    }
    const image = req.file ? `/uploads/events/${req.file.filename}` : null;
    const form = extractFormConfig(req.body);
    if (regModel.audienceAllowsGroup(form.formulaire_type) && form.accompagnants_max < 1) {
      return res.status(400).json({
        message: 'Indiquez un nombre maximum de membres du groupe (≥ 1).',
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
      payant: isPayant,
      prix,
      audience: normalizeAudience(audience),
      ...form,
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
      lieu,
      statut,
      inscription_ouverte,
      payant,
      prix,
      audience,
    } = req.body;
    if (!titre || !description || !date) {
      return res.status(400).json({ message: 'Titre, description et date requis.' });
    }
    if (statut && !statuts.has(statut)) {
      return res.status(400).json({ message: 'Statut invalide.' });
    }
    const isPayant = parsePayant(payant);
    if (isPayant && !String(prix || '').trim()) {
      return res.status(400).json({ message: 'Indiquez le montant pour un événement payant.' });
    }
    const form = extractFormConfig(req.body);
    if (regModel.audienceAllowsGroup(form.formulaire_type) && form.accompagnants_max < 1) {
      return res.status(400).json({
        message: 'Indiquez un nombre maximum de membres du groupe (≥ 1).',
      });
    }
    const data = {
      titre,
      description,
      date,
      lieu,
      statut,
      inscription_ouverte: parseOpen(inscription_ouverte),
      payant: isPayant,
      prix,
      audience: normalizeAudience(audience),
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
    if (event.audience === 'membres' && !isClubMember(req.user)) {
      return res.status(403).json({
        message: 'Cet événement est réservé aux membres. Connectez-vous pour vous inscrire.',
      });
    }
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

function parseRegistrationIds(body) {
  const raw = body?.registration_ids ?? body?.ids ?? [];
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
}

async function saveListeFinale(req, res, next) {
  try {
    const event = await eventModel.getById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Événement introuvable.' });
    const row = await eventModel.saveListeFinale(event.id, req.body);
    if (!row) return res.status(404).json({ message: 'Événement introuvable.' });
    res.json({
      message: 'Liste des candidats choisis enregistrée.',
      liste_finale: row.liste_finale,
      liste_finale_at: row.liste_finale_at,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

async function sendSelectionEmails(req, res, next) {
  try {
    const event = await eventModel.getById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Événement introuvable.' });

    const registrationIds = parseRegistrationIds(req.body);
    if (!registrationIds.length) {
      return res.status(400).json({ message: 'Aucun candidat sélectionné.' });
    }

    const bodyTemplate = String(req.body.body || req.body.corps || '').trim();
    if (!bodyTemplate) {
      return res.status(400).json({ message: 'Le contenu du mail est obligatoire.' });
    }

    const subjectTemplate = String(req.body.subject || '').trim();
    const allRegs = await regModel.listEventRegistrations(event.id);
    const selected = allRegs.filter((r) => registrationIds.includes(Number(r.id)));
    if (!selected.length) {
      return res.status(400).json({ message: 'Aucune inscription trouvée pour la sélection.' });
    }

    const results = [];
    for (const reg of selected) {
      if (!reg.email) {
        results.push({ id: reg.id, ok: false, error: 'Email manquant.' });
        continue;
      }
      const mail = buildSelectionEmail(reg, event, {
        subject: subjectTemplate,
        body: bodyTemplate,
      });
      try {
        const info = await sendMail({
          to: reg.email,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
        });
        results.push({
          id: reg.id,
          email: reg.email,
          ok: true,
          simulated: !!info?.simulated,
        });
      } catch (err) {
        results.push({
          id: reg.id,
          email: reg.email,
          ok: false,
          error: err.message || 'Erreur SMTP.',
        });
      }
    }

    const sent = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok);
    const simulated = results.some((r) => r.ok && r.simulated);
    res.json({
      message: simulated
        ? `${sent} mail(s) simulé(s) (SMTP non configuré — voir console serveur).`
        : `${sent} mail(s) envoyé(s)${failed.length ? `, ${failed.length} échec(s)` : ''}.`,
      sent,
      simulated,
      failed,
      results,
    });
  } catch (err) {
    next(err);
  }
}

async function setRegistrationPayment(req, res, next) {
  try {
    const event = await eventModel.getById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Événement introuvable.' });
    if (!event.payant) {
      return res.status(400).json({ message: 'Cet événement n’est pas payant.' });
    }
    const validated =
      req.body.paiement_valide === true ||
      req.body.paiement_valide === 1 ||
      req.body.paiement_valide === '1' ||
      req.body.paiement_valide === 'true';
    const row = await regModel.setEventRegistrationPayment(
      req.params.registrationId,
      event.id,
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
  saveListeFinale,
  sendSelectionEmails,
  setRegistrationPayment,
};
