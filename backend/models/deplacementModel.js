const pool = require('../config/db');
const { normalizeCustomFields } = require('./activityRegistrationModel');

function parseJsonField(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/** Structure fixe d'une équipe pour une compétition externe. */
const DEFAULT_COMPETITOR_FIELDS = [
  {
    id: 'comp_nombre_membres',
    label: 'Nombre de membres de votre groupe',
    type: 'select',
    options: ['1', '2', '3', '4'],
    required: true,
  },
  {
    id: 'comp_nom_robot',
    label: 'Nom du robot',
    type: 'text',
    required: true,
  },
  { id: 'membre_2_prenom', label: 'Prénom du 2ème membre', type: 'text', required: false },
  { id: 'membre_2_nom', label: 'Nom du 2ème membre', type: 'text', required: false },
  { id: 'membre_2_email', label: 'Email du 2ème membre', type: 'text', required: false },
  {
    id: 'membre_2_telephone',
    label: 'Numéro de téléphone du 2ème membre',
    type: 'text',
    required: false,
  },
  {
    id: 'membre_2_filiere',
    label: 'Filière du 2ème membre',
    type: 'select',
    options: ['EI', 'MECA', 'IA', 'GTE', 'GMP', 'ASE', 'Mastère'],
    required: false,
  },
  { id: 'membre_3_prenom', label: 'Prénom du 3ème membre', type: 'text', required: false },
  { id: 'membre_3_nom', label: 'Nom du 3ème membre', type: 'text', required: false },
  { id: 'membre_3_email', label: 'Email du 3ème membre', type: 'text', required: false },
  {
    id: 'membre_3_telephone',
    label: 'Numéro de téléphone du 3ème membre',
    type: 'text',
    required: false,
  },
  {
    id: 'membre_3_filiere',
    label: 'Filière du 3ème membre',
    type: 'select',
    options: ['EI', 'MECA', 'IA', 'GTE', 'GMP', 'ASE', 'Mastère'],
    required: false,
  },
  { id: 'membre_4_prenom', label: 'Prénom du 4ème membre', type: 'text', required: false },
  { id: 'membre_4_nom', label: 'Nom du 4ème membre', type: 'text', required: false },
  { id: 'membre_4_email', label: 'Email du 4ème membre', type: 'text', required: false },
  {
    id: 'membre_4_telephone',
    label: 'Numéro de téléphone du 4ème membre',
    type: 'text',
    required: false,
  },
  {
    id: 'membre_4_filiere',
    label: 'Filière du 4ème membre',
    type: 'select',
    options: ['EI', 'MECA', 'IA', 'GTE', 'GMP', 'ASE', 'Mastère'],
    required: false,
  },
];

function resolveCompetitorFields() {
  return DEFAULT_COMPETITOR_FIELDS;
}

function normalizeDeplacement(row) {
  if (!row) return null;
  const count = Number(row.inscriptions_count) || 0;
  const max =
    row.places_max != null && row.places_max !== ''
      ? Number(row.places_max)
      : null;
  const placesMax = max && !Number.isNaN(max) && max > 0 ? max : null;
  const placesRestantes = placesMax != null ? Math.max(0, placesMax - count) : null;
  return {
    ...row,
    inscription_ouverte:
      Number(row.inscription_ouverte) === 1 || row.inscription_ouverte === true,
    payant: Number(row.payant) === 1 || row.payant === true,
    prix: row.prix || null,
    affiche_url: row.affiche_url || null,
    places_max: placesMax,
    inscriptions_count: count,
    places_restantes: placesRestantes,
    complet: placesMax != null ? placesRestantes <= 0 : false,
    champs_personnalises: [],
    champs_competiteur: resolveCompetitorFields(),
    liste_finale: parseJsonField(row.liste_finale, null),
    liste_finale_at: row.liste_finale_at || null,
  };
}

function normalizeRegistration(row) {
  if (!row) return null;
  const role =
    row.role_candidat === 'competiteur' ? 'competiteur' : 'spectateur';
  return {
    ...row,
    role_candidat: role,
    accepte_paiement:
      Number(row.accepte_paiement) === 1 || row.accepte_paiement === true,
    paiement_valide:
      Number(row.paiement_valide) === 1 || row.paiement_valide === true,
    reponses_personnalisees: parseJsonField(row.reponses_personnalisees, {}),
  };
}

function serializeCustomFields(data) {
  return JSON.stringify(normalizeCustomFields(data.champs_personnalises));
}

function serializeCompetitorFields(data) {
  return JSON.stringify(normalizeCustomFields(data.champs_competiteur));
}

function parsePlacesMax(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

async function getAll() {
  const [rows] = await pool.execute(
    `SELECT d.*,
            (SELECT COUNT(*) FROM deplacement_registrations r WHERE r.deplacement_id = d.id) AS inscriptions_count
     FROM deplacements d
     ORDER BY COALESCE(d.date_competition, d.created_at) DESC, d.id DESC`
  );
  return rows.map(normalizeDeplacement);
}

async function getOpen() {
  const all = await getAll();
  return all.filter((d) => d.inscription_ouverte && !d.complet);
}

async function getById(id) {
  const [rows] = await pool.execute(
    `SELECT d.*,
            (SELECT COUNT(*) FROM deplacement_registrations r WHERE r.deplacement_id = d.id) AS inscriptions_count
     FROM deplacements d
     WHERE d.id = ?`,
    [id]
  );
  return normalizeDeplacement(rows[0] || null);
}

async function create(data) {
  const payant = data.payant ? 1 : 0;
  const prix = payant && data.prix ? String(data.prix).trim() : null;
  const [result] = await pool.execute(
    `INSERT INTO deplacements
      (titre, description, destination, competition, affiche_url, date_competition, prix, payant,
       inscription_ouverte, places_max, champs_personnalises, champs_competiteur)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.titre,
      data.description,
      data.destination || null,
      data.competition || null,
      data.affiche_url || null,
      data.date_competition || null,
      prix,
      payant,
      data.inscription_ouverte ? 1 : 0,
      parsePlacesMax(data.places_max),
      serializeCustomFields(data),
      serializeCompetitorFields(data),
    ]
  );
  return getById(result.insertId);
}

async function update(id, data) {
  const existing = await getById(id);
  if (!existing) return null;
  const open =
    data.inscription_ouverte !== undefined
      ? data.inscription_ouverte
        ? 1
        : 0
      : existing.inscription_ouverte
        ? 1
        : 0;
  const payant =
    data.payant !== undefined ? (data.payant ? 1 : 0) : existing.payant ? 1 : 0;
  const prixRaw = data.prix !== undefined ? data.prix : existing.prix;
  const prix = payant && prixRaw ? String(prixRaw).trim() : null;
  const places =
    data.places_max !== undefined
      ? parsePlacesMax(data.places_max)
      : existing.places_max;
  const champs = serializeCustomFields({
    champs_personnalises:
      data.champs_personnalises !== undefined
        ? data.champs_personnalises
        : existing.champs_personnalises,
  });
  const champsComp = serializeCompetitorFields({
    champs_competiteur:
      data.champs_competiteur !== undefined
        ? data.champs_competiteur
        : existing.champs_competiteur,
  });

  const afficheUrl =
    data.affiche_url !== undefined ? data.affiche_url || null : existing.affiche_url || null;

  await pool.execute(
    `UPDATE deplacements
     SET titre = ?, description = ?, destination = ?, competition = ?, affiche_url = ?,
         date_competition = ?, prix = ?, payant = ?, inscription_ouverte = ?, places_max = ?,
         champs_personnalises = ?, champs_competiteur = ?
     WHERE id = ?`,
    [
      data.titre,
      data.description,
      data.destination || null,
      data.competition !== undefined ? data.competition || null : existing.competition || null,
      afficheUrl,
      data.date_competition !== undefined
        ? data.date_competition || null
        : existing.date_competition || null,
      prix,
      payant,
      open,
      places,
      champs,
      champsComp,
      id,
    ]
  );
  return getById(id);
}

async function setInscriptionOpen(id, open) {
  const [result] = await pool.execute(
    `UPDATE deplacements SET inscription_ouverte = ? WHERE id = ?`,
    [open ? 1 : 0, id]
  );
  if (!result.affectedRows) return null;
  return getById(id);
}

async function remove(id) {
  await pool.execute(`DELETE FROM deplacement_registrations WHERE deplacement_id = ?`, [id]);
  const [result] = await pool.execute(`DELETE FROM deplacements WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

async function listRegistrations(deplacementId) {
  const [rows] = await pool.execute(
    `SELECT * FROM deplacement_registrations
     WHERE deplacement_id = ?
     ORDER BY created_at ASC`,
    [deplacementId]
  );
  return rows.map(normalizeRegistration);
}

async function createRegistration(deplacementId, data) {
  const accepte = data.accepte_paiement ? 1 : 0;
  const role = data.role_candidat === 'competiteur' ? 'competiteur' : 'spectateur';
  const reponsesJson =
    data.reponses_personnalisees && Object.keys(data.reponses_personnalisees).length
      ? JSON.stringify(data.reponses_personnalisees)
      : null;
  try {
    const [result] = await pool.execute(
      `INSERT INTO deplacement_registrations
        (deplacement_id, member_id, prenom, nom, email, telephone, filiere, annee, role_candidat,
         motivation, accepte_paiement, reponses_personnalisees)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        deplacementId,
        data.member_id || null,
        data.prenom,
        data.nom,
        data.email,
        data.telephone,
        data.filiere || null,
        data.annee || null,
        role,
        data.motivation || null,
        accepte,
        reponsesJson,
      ]
    );
    return result.insertId;
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    const [result] = await pool.execute(
      `INSERT INTO deplacement_registrations
        (deplacement_id, member_id, prenom, nom, email, telephone, filiere, annee,
         motivation, accepte_paiement, reponses_personnalisees)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        deplacementId,
        data.member_id || null,
        data.prenom,
        data.nom,
        data.email,
        data.telephone,
        data.filiere || null,
        data.annee || null,
        data.motivation || null,
        accepte,
        reponsesJson,
      ]
    );
    return result.insertId;
  }
}

async function setRegistrationPayment(registrationId, deplacementId, validated) {
  const value = validated ? 1 : 0;
  const [result] = await pool.execute(
    `UPDATE deplacement_registrations
     SET paiement_valide = ?,
         paiement_valide_at = CASE
           WHEN ? = 1 THEN COALESCE(paiement_valide_at, NOW())
           ELSE NULL
         END
     WHERE id = ? AND deplacement_id = ?`,
    [value, value, registrationId, deplacementId]
  );
  if (!result.affectedRows) return null;
  const [rows] = await pool.execute(
    `SELECT * FROM deplacement_registrations WHERE id = ? AND deplacement_id = ?`,
    [registrationId, deplacementId]
  );
  return normalizeRegistration(rows[0] || null);
}

async function saveListeFinale(id, payload) {
  const personnes = Array.isArray(payload?.personnes) ? payload.personnes : [];
  const spectatorIds = Array.isArray(payload?.spectator_ids)
    ? payload.spectator_ids.map((x) => Number(x)).filter((n) => Number.isFinite(n))
    : [];
  const cleaned = personnes.map((row, index) => ({
    id: String(row?.id || `row-${index + 1}`),
    fullName: String(row?.fullName || '').trim(),
    prenom: String(row?.prenom || '').trim(),
    nom: String(row?.nom || '').trim(),
    type: String(row?.type || '').trim(),
    detail: String(row?.detail || '').trim(),
    robot: String(row?.robot || '').trim(),
  }));
  const data = JSON.stringify({
    personnes: cleaned,
    spectator_ids: spectatorIds,
  });
  const [result] = await pool.execute(
    `UPDATE deplacements
     SET liste_finale = ?, liste_finale_at = NOW()
     WHERE id = ?`,
    [data, id]
  );
  if (!result.affectedRows) return null;
  return getById(id);
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
  createRegistration,
  setRegistrationPayment,
  saveListeFinale,
  parsePlacesMax,
  resolveCompetitorFields,
  DEFAULT_COMPETITOR_FIELDS,
};
