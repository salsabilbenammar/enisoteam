const pool = require('../config/db');

const DEFAULTS = {
  id: 1,
  cotisation_montant: 30,
  cotisation_annee: new Date().getFullYear(),
  date_echeance: `${new Date().getFullYear()}-12-31`,
  devise: 'DT',
};

function normalize(row) {
  const year = Number(row?.cotisation_annee) || DEFAULTS.cotisation_annee;
  let echeance = row?.date_echeance;
  if (echeance instanceof Date) {
    const pad = (n) => String(n).padStart(2, '0');
    echeance = `${echeance.getFullYear()}-${pad(echeance.getMonth() + 1)}-${pad(echeance.getDate())}`;
  } else if (echeance) {
    echeance = String(echeance).slice(0, 10);
  } else {
    echeance = `${year}-12-31`;
  }
  return {
    id: 1,
    cotisation_montant: Number(row?.cotisation_montant ?? DEFAULTS.cotisation_montant),
    cotisation_annee: year,
    date_echeance: echeance,
    devise: row?.devise || DEFAULTS.devise,
  };
}

async function get() {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM finance_settings WHERE id = 1 LIMIT 1'
    );
    if (rows[0]) return normalize(rows[0]);
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
  }
  return normalize(DEFAULTS);
}

async function update(data = {}) {
  const current = await get();
  const payload = {
    cotisation_montant: Number(
      data.cotisation_montant ?? current.cotisation_montant
    ),
    cotisation_annee: Number(data.cotisation_annee ?? current.cotisation_annee),
    date_echeance: String(data.date_echeance ?? current.date_echeance).slice(0, 10),
    devise: String(data.devise ?? current.devise ?? 'DT').slice(0, 8),
  };

  await pool.execute(
    `INSERT INTO finance_settings
      (id, cotisation_montant, cotisation_annee, date_echeance, devise)
     VALUES (1, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      cotisation_montant = VALUES(cotisation_montant),
      cotisation_annee = VALUES(cotisation_annee),
      date_echeance = VALUES(date_echeance),
      devise = VALUES(devise)`,
    [
      payload.cotisation_montant,
      payload.cotisation_annee,
      payload.date_echeance,
      payload.devise,
    ]
  );
  return get();
}

module.exports = { get, update, DEFAULTS };
