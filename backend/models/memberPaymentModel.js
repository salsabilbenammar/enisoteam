const pool = require('../config/db');
const settingsModel = require('./financeSettingsModel');
const typeModel = require('./financeCotisationTypeModel');

const METHODS = ['especes', 'cheque', 'virement', 'carte'];
const METHOD_LABELS = {
  especes: 'Espèces',
  cheque: 'Chèque',
  virement: 'Virement',
  carte: 'Carte',
};

function todayKey() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function computeStatus(paidTotal, dueAmount, echeance) {
  // Si montant dû = 0, on considère payé dès qu'il y a au moins un paiement,
  // sinon "en attente" tant que rien n'est versé.
  if (Number(dueAmount) <= 0) {
    return Number(paidTotal) > 0 ? 'paye' : 'en_attente';
  }
  if (Number(paidTotal) + 0.001 >= Number(dueAmount)) return 'paye';
  const due = String(echeance || '').slice(0, 10);
  if (due && todayKey() > due) return 'en_retard';
  return 'en_attente';
}

async function create(data) {
  const [result] = await pool.execute(
    `INSERT INTO member_payments
      (member_id, montant, date_paiement, methode, annee_cotisation, cotisation_type,
       detail_nom, detail_option, detail_ref_id, note, transaction_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.member_id,
      data.montant,
      data.date_paiement,
      data.methode,
      data.annee_cotisation,
      data.cotisation_type || 'recrutement',
      data.detail_nom || null,
      data.detail_option || null,
      data.detail_ref_id || null,
      data.note || null,
      data.transaction_id || null,
      data.created_by || null,
    ]
  );
  return findById(result.insertId);
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT p.*, m.nom AS member_nom, m.email AS member_email, m.filiere AS member_filiere
     FROM member_payments p
     JOIN members m ON m.id = p.member_id
     WHERE p.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function linkTransaction(id, transactionId) {
  await pool.execute(`UPDATE member_payments SET transaction_id = ? WHERE id = ?`, [
    transactionId,
    id,
  ]);
  return findById(id);
}

async function listByMember(memberId, { annee, type } = {}) {
  const where = ['p.member_id = ?'];
  const params = [memberId];
  if (annee) {
    where.push('p.annee_cotisation = ?');
    params.push(Number(annee));
  }
  if (type) {
    where.push('p.cotisation_type = ?');
    params.push(String(type));
  }
  const [rows] = await pool.execute(
    `SELECT p.*
     FROM member_payments p
     WHERE ${where.join(' AND ')}
     ORDER BY p.date_paiement DESC, p.id DESC`,
    params
  );
  return rows;
}

async function listPayments({
  member_id = '',
  annee = '',
  type = '',
  methode = '',
  from = '',
  to = '',
  page = 1,
  limit = 50,
} = {}) {
  const where = [];
  const params = [];
  if (member_id) {
    where.push('p.member_id = ?');
    params.push(Number(member_id));
  }
  if (annee) {
    where.push('p.annee_cotisation = ?');
    params.push(Number(annee));
  }
  if (type) {
    where.push('p.cotisation_type = ?');
    params.push(String(type));
  }
  if (methode && METHODS.includes(methode)) {
    where.push('p.methode = ?');
    params.push(methode);
  }
  if (from) {
    where.push('p.date_paiement >= ?');
    params.push(String(from).slice(0, 10));
  }
  if (to) {
    where.push('p.date_paiement <= ?');
    params.push(String(to).slice(0, 10));
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (Math.max(1, page) - 1) * limit;

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM member_payments p ${clause}`,
    params
  );
  const [rows] = await pool.execute(
    `SELECT p.*, m.nom AS member_nom, m.email AS member_email
     FROM member_payments p
     JOIN members m ON m.id = p.member_id
     ${clause}
     ORDER BY p.date_paiement DESC, p.id DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );
  const total = Number(countRows[0].total);
  return {
    items: rows,
    total,
    page: Number(page),
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

async function remove(id) {
  const [result] = await pool.execute(`DELETE FROM member_payments WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

/** Liste membres + statut pour un type de cotisation + année */
async function listCotisations({
  annee,
  type = 'recrutement',
  statut = '',
  search = '',
  page = 1,
  limit = 20,
} = {}) {
  const settings = await settingsModel.get();
  const year = Number(annee) || settings.cotisation_annee;
  const typeRow = (await typeModel.findByCode(type)) || (await typeModel.list({ activeOnly: true }))[0];
  const typeCode = typeRow?.code || 'recrutement';
  const dueAmount = Number(typeRow?.montant_defaut ?? settings.cotisation_montant);
  const echeance = settings.date_echeance;
  const typeLabel = typeRow?.label || typeCode;

  const where = ['m.actif = 1'];
  const params = [];
  if (search.trim()) {
    where.push('(m.nom LIKE ? OR m.email LIKE ? OR m.filiere LIKE ?)');
    const q = `%${search.trim()}%`;
    params.push(q, q, q);
  }
  const clause = `WHERE ${where.join(' AND ')}`;

  const [rows] = await pool.execute(
    `SELECT m.id, m.nom, m.email, m.filiere, m.actif, m.created_at,
            COALESCE(SUM(p.montant), 0) AS paid_total,
            COUNT(p.id) AS payments_count,
            MAX(p.date_paiement) AS last_payment_date
     FROM members m
     LEFT JOIN member_payments p
       ON p.member_id = m.id
      AND p.annee_cotisation = ?
      AND p.cotisation_type = ?
     ${clause}
     GROUP BY m.id, m.nom, m.email, m.filiere, m.actif, m.created_at
     ORDER BY m.nom ASC`,
    [year, typeCode, ...params]
  );

  let items = rows.map((r) => {
    const paid = Number(r.paid_total);
    const status = computeStatus(paid, dueAmount, echeance);
    return {
      member_id: r.id,
      nom: r.nom,
      email: r.email,
      filiere: r.filiere,
      annee: year,
      cotisation_type: typeCode,
      cotisation_label: typeLabel,
      paid_total: paid,
      due_amount: dueAmount,
      remaining: Math.max(0, Math.round((dueAmount - paid) * 100) / 100),
      statut: status,
      payments_count: Number(r.payments_count),
      last_payment_date: r.last_payment_date,
      date_echeance: echeance,
      devise: settings.devise,
    };
  });

  if (statut && ['paye', 'en_attente', 'en_retard'].includes(statut)) {
    items = items.filter((i) => i.statut === statut);
  }

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const p = Math.min(Math.max(1, page), pages);
  const offset = (p - 1) * limit;
  const pageItems = items.slice(offset, offset + Number(limit));

  const counts = {
    paye: items.filter((i) => i.statut === 'paye').length,
    en_attente: items.filter((i) => i.statut === 'en_attente').length,
    en_retard: items.filter((i) => i.statut === 'en_retard').length,
    total: items.length,
  };

  return {
    items: pageItems,
    total,
    page: p,
    pages,
    limit: Number(limit),
    annee: year,
    cotisation_type: typeCode,
    cotisation_label: typeLabel,
    due_amount: dueAmount,
    date_echeance: echeance,
    devise: settings.devise,
    counts,
  };
}

async function cotisationRate(annee, type = 'recrutement') {
  const data = await listCotisations({ annee, type, page: 1, limit: 100000 });
  const total = data.counts.total || 0;
  const paye = data.counts.paye || 0;
  return {
    annee: data.annee,
    cotisation_type: data.cotisation_type,
    cotisation_label: data.cotisation_label,
    total_membres: total,
    payes: paye,
    taux: total ? Math.round((paye / total) * 1000) / 10 : 0,
    counts: data.counts,
    due_amount: data.due_amount,
  };
}

module.exports = {
  METHODS,
  METHOD_LABELS,
  create,
  findById,
  linkTransaction,
  listByMember,
  listPayments,
  remove,
  listCotisations,
  cotisationRate,
  computeStatus,
};
