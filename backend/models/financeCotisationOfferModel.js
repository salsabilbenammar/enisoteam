const pool = require('../config/db');

const OFFER_TYPES = ['pull', 'deplacement', 'robot'];

const PULL_FORM_DEFS = {
  tshirt: {
    titre: 'T-shirt ENISO Team',
    description: 'Commande du T-shirt officiel ENISO Team',
  },
  capuche: {
    titre: 'Hoodie ENISO Team',
    description: 'Commande du hoodie officiel ENISO Team',
  },
};

function mapOfferRow(row) {
  if (!row) return row;
  return {
    ...row,
    ouvert: Number(row.ouvert) === 1,
    interests_count: Number(row.interests_count || 0),
  };
}

async function listOffers({ type = '', openOnly = false } = {}) {
  const where = [];
  const params = [];
  if (type) {
    where.push('cotisation_type = ?');
    params.push(type);
  }
  if (openOnly) {
    where.push('ouvert = 1');
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.execute(
    `SELECT o.*,
            (SELECT COUNT(*) FROM finance_cotisation_interests i WHERE i.offer_id = o.id) AS interests_count
     FROM finance_cotisation_offers o
     ${clause}
     ORDER BY o.created_at DESC, o.id DESC`,
    params
  );
  return rows.map((r) => mapOfferRow({ ...r, interests_count: r.interests_count }));
}

async function findOffer(id) {
  const [rows] = await pool.execute(
    `SELECT * FROM finance_cotisation_offers WHERE id = ?`,
    [id]
  );
  if (!rows[0]) return null;
  return mapOfferRow(rows[0]);
}

async function findPullForm(detailOption) {
  const key = String(detailOption || '').trim();
  if (!PULL_FORM_DEFS[key]) return null;
  const [rows] = await pool.execute(
    `SELECT o.*,
            (SELECT COUNT(*) FROM finance_cotisation_interests i WHERE i.offer_id = o.id) AS interests_count
     FROM finance_cotisation_offers o
     WHERE o.cotisation_type = 'pull' AND o.detail_option = ?
     LIMIT 1`,
    [key]
  );
  return mapOfferRow(rows[0] || null);
}

async function ensurePullForm(detailOption) {
  const key = String(detailOption || '').trim();
  const def = PULL_FORM_DEFS[key];
  if (!def) {
    const err = new Error('Variante pull invalide (tshirt ou capuche).');
    err.status = 400;
    throw err;
  }
  let row = await findPullForm(key);
  if (row) return row;
  const [result] = await pool.execute(
    `INSERT INTO finance_cotisation_offers
      (cotisation_type, detail_option, titre, description, external_url, ouvert)
     VALUES ('pull', ?, ?, ?, NULL, 0)`,
    [key, def.titre, def.description]
  );
  return findOffer(result.insertId);
}

async function listPullForms() {
  const forms = [];
  for (const key of Object.keys(PULL_FORM_DEFS)) {
    forms.push(await ensurePullForm(key));
  }
  return forms;
}

async function updatePullForm(detailOption, data = {}) {
  const row = await ensurePullForm(detailOption);
  return updateOffer(row.id, {
    titre: PULL_FORM_DEFS[detailOption]?.titre || row.titre,
    description: PULL_FORM_DEFS[detailOption]?.description || row.description,
    external_url: `/boutique/${detailOption}`,
    ouvert: data.ouvert !== undefined ? data.ouvert : row.ouvert,
    prix_total: data.prix_total !== undefined ? data.prix_total : row.prix_total,
    photo_url: data.photo_url !== undefined ? data.photo_url : row.photo_url,
    photo_back_url:
      data.photo_back_url !== undefined ? data.photo_back_url : row.photo_back_url,
  });
}

async function createOffer(data) {
  const type = String(data.cotisation_type || '').trim();
  if (!OFFER_TYPES.includes(type)) {
    const err = new Error('Type d’offre invalide (pull, deplacement, robot).');
    err.status = 400;
    throw err;
  }
  const externalUrl = String(data.external_url || '').trim();
  if (!externalUrl) {
    const err = new Error('URL du formulaire sur le site officiel requise.');
    err.status = 400;
    throw err;
  }
  const [result] = await pool.execute(
    `INSERT INTO finance_cotisation_offers (cotisation_type, detail_option, titre, description, external_url, ouvert)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      type,
      data.detail_option ? String(data.detail_option).trim() : null,
      String(data.titre || '').trim(),
      data.description ? String(data.description).trim() : null,
      externalUrl,
      data.ouvert === false || data.ouvert === 0 || data.ouvert === '0' ? 0 : 1,
    ]
  );
  return findOffer(result.insertId);
}

async function updateOffer(id, data) {
  const existing = await findOffer(id);
  if (!existing) return null;
  await pool.execute(
    `UPDATE finance_cotisation_offers
     SET titre = ?, description = ?, external_url = ?, ouvert = ?, prix_total = ?, photo_url = ?, photo_back_url = ?
     WHERE id = ?`,
    [
      data.titre !== undefined ? String(data.titre).trim() : existing.titre,
      data.description !== undefined
        ? String(data.description || '').trim() || null
        : existing.description,
      data.external_url !== undefined
        ? String(data.external_url || '').trim() || null
        : existing.external_url,
      data.ouvert === undefined
        ? existing.ouvert
          ? 1
          : 0
        : data.ouvert === false || data.ouvert === 0 || data.ouvert === '0'
          ? 0
          : 1,
      data.prix_total !== undefined ? Number(data.prix_total) : existing.prix_total,
      data.photo_url !== undefined ? data.photo_url || null : existing.photo_url,
      data.photo_back_url !== undefined
        ? data.photo_back_url || null
        : existing.photo_back_url,
      id,
    ]
  );
  return findOffer(id);
}

async function removeOffer(id) {
  const [result] = await pool.execute(
    `DELETE FROM finance_cotisation_offers WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
}

async function createInterest(data) {
  const [result] = await pool.execute(
    `INSERT INTO finance_cotisation_interests
      (offer_id, member_id, prenom, nom, email, telephone, detail_option,
       filiere, taille, prix_total, acompte, accepte_paiement, statut_commande)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_attente')`,
    [
      data.offer_id,
      data.member_id || null,
      data.prenom,
      data.nom,
      String(data.email).trim().toLowerCase(),
      data.telephone || null,
      data.detail_option || null,
      data.filiere || null,
      data.taille || null,
      data.prix_total || 40,
      data.acompte || null,
      data.accepte_paiement ? 1 : 0,
    ]
  );
  const [rows] = await pool.execute(
    `SELECT * FROM finance_cotisation_interests WHERE id = ?`,
    [result.insertId]
  );
  return rows[0];
}

async function listMerchOrders(detailOption = '') {
  const params = [];
  let filter = '';
  if (detailOption) {
    filter = 'AND o.detail_option = ?';
    params.push(detailOption);
  }
  const [rows] = await pool.execute(
    `SELECT i.*, o.titre, o.detail_option AS produit
     FROM finance_cotisation_interests i
     JOIN finance_cotisation_offers o ON o.id = i.offer_id
     WHERE o.cotisation_type = 'pull' ${filter}
     ORDER BY i.created_at DESC`,
    params
  );
  return rows;
}

async function updateMerchOrderStatus(id, status) {
  const allowed = new Set(['en_attente', 'confirmee', 'livree', 'annulee']);
  if (!allowed.has(status)) return null;
  const [result] = await pool.execute(
    `UPDATE finance_cotisation_interests
     SET statut_commande = ?
     WHERE id = ?`,
    [status, id]
  );
  if (!result.affectedRows) return null;
  const [rows] = await pool.execute(
    `SELECT * FROM finance_cotisation_interests WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function removeMerchOrder(id) {
  const [result] = await pool.execute(
    `DELETE FROM finance_cotisation_interests WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
}

async function listInterests(offerId) {
  const [rows] = await pool.execute(
    `SELECT i.*, m.nom AS member_account_nom, m.filiere
     FROM finance_cotisation_interests i
     LEFT JOIN members m ON m.id = i.member_id
     WHERE i.offer_id = ?
     ORDER BY i.created_at DESC`,
    [offerId]
  );
  return rows;
}

/** Membres éligibles au paiement = ceux qui ont rempli le formulaire de l’offre */
async function eligibleMembersForOffer(offerId) {
  const offer = await findOffer(offerId);
  if (!offer) return [];
  // COLLATE explicite : tables members / interests n’ont pas la même collation email
  const [rows] = await pool.execute(
    `SELECT DISTINCT m.id, m.nom, m.email, m.filiere,
            i.detail_option, i.prenom AS interest_prenom, i.nom AS interest_nom
     FROM finance_cotisation_interests i
     JOIN members m
       ON (i.member_id IS NOT NULL AND m.id = i.member_id)
       OR (
         LOWER(TRIM(m.email)) COLLATE utf8mb4_unicode_ci
         = LOWER(TRIM(i.email)) COLLATE utf8mb4_unicode_ci
       )
     WHERE i.offer_id = ? AND m.actif = 1
     ORDER BY m.nom ASC`,
    [offerId]
  );
  return rows;
}

async function eligibleMembersForTraining(trainingId) {
  const [rows] = await pool.execute(
    `SELECT DISTINCT m.id, m.nom, m.email, m.filiere
     FROM training_registrations r
     JOIN members m
       ON LOWER(TRIM(m.email)) COLLATE utf8mb4_unicode_ci
        = LOWER(TRIM(r.email)) COLLATE utf8mb4_unicode_ci
     WHERE r.training_id = ? AND m.actif = 1
     ORDER BY m.nom ASC`,
    [trainingId]
  );
  return rows;
}

async function eligibleMembersForEvent(eventId) {
  const [rows] = await pool.execute(
    `SELECT DISTINCT m.id, m.nom, m.email, m.filiere
     FROM event_registrations r
     JOIN members m
       ON LOWER(TRIM(m.email)) COLLATE utf8mb4_unicode_ci
        = LOWER(TRIM(r.email)) COLLATE utf8mb4_unicode_ci
     WHERE r.event_id = ? AND m.actif = 1
     ORDER BY m.nom ASC`,
    [eventId]
  );
  return rows;
}

async function eligibleMembersForRecrutement() {
  const { provisionMemberFromCandidate } = require('../services/memberProvisionService');
  const [rows] = await pool.execute(
    `SELECT c.id AS candidate_id, c.prenom, c.nom, c.email, c.filiere, c.statut,
            m.id AS member_id
     FROM recruitment_candidates c
     LEFT JOIN members m
       ON LOWER(TRIM(m.email)) COLLATE utf8mb4_unicode_ci
        = LOWER(TRIM(c.email)) COLLATE utf8mb4_unicode_ci
     WHERE c.statut IN ('paiement_en_attente', 'accepte')
       AND (c.stream IS NULL OR c.stream = 'general' OR c.stream = '')
     ORDER BY c.nom ASC, c.prenom ASC`
  );

  const out = [];
  const seen = new Set();
  for (const row of rows) {
    const email = String(row.email || '')
      .trim()
      .toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);

    let memberId = row.member_id ? Number(row.member_id) : null;
    let nom = `${row.prenom || ''} ${row.nom || ''}`.trim() || email;
    let filiere = row.filiere || null;

    if (!memberId) {
      try {
        const provisioned = await provisionMemberFromCandidate({
          prenom: row.prenom,
          nom: row.nom,
          email,
          filiere: row.filiere,
        });
        memberId = provisioned.member.id;
        nom = provisioned.member.nom || nom;
        filiere = provisioned.member.filiere || filiere;
      } catch (err) {
        console.error('[finance] Provision membre recrutement:', err.message);
        continue;
      }
    }

    out.push({
      id: memberId,
      nom,
      email,
      filiere,
      candidate_id: row.candidate_id,
      statut: row.statut,
    });
  }
  return out;
}

async function listPaidTrainings() {
  const [rows] = await pool.execute(
    `SELECT id, titre, prix, payante, inscription_ouverte,
            (SELECT COUNT(*) FROM training_registrations r WHERE r.training_id = t.id) AS inscriptions_count
     FROM trainings t
     WHERE payante = 1
     ORDER BY created_at DESC, id DESC`
  );
  return rows;
}

async function listEventsOptions() {
  const [rows] = await pool.execute(
    `SELECT id, titre, date AS date_event, inscription_ouverte,
            (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id = e.id) AS inscriptions_count
     FROM events e
     ORDER BY date DESC, id DESC`
  );
  return rows;
}

async function findTraining(id) {
  const [rows] = await pool.execute(`SELECT id, titre FROM trainings WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function findEvent(id) {
  const [rows] = await pool.execute(`SELECT id, titre FROM events WHERE id = ?`, [id]);
  return rows[0] || null;
}

module.exports = {
  OFFER_TYPES,
  PULL_FORM_DEFS,
  listOffers,
  findOffer,
  findPullForm,
  ensurePullForm,
  listPullForms,
  updatePullForm,
  createOffer,
  updateOffer,
  removeOffer,
  createInterest,
  listInterests,
  listMerchOrders,
  updateMerchOrderStatus,
  removeMerchOrder,
  eligibleMembersForOffer,
  eligibleMembersForTraining,
  eligibleMembersForEvent,
  eligibleMembersForRecrutement,
  listPaidTrainings,
  listEventsOptions,
  findTraining,
  findEvent,
};
