const path = require('path');
const pool = require(path.join(__dirname, '..', 'backend', 'config', 'db'));

const DEFAULT_TYPES = [
  { code: 'recrutement', label: 'Cotisation recrutement', montant: 30, sort_order: 1 },
  { code: 'formation', label: 'Cotisation formation payante', montant: 0, sort_order: 2 },
  { code: 'deplacement', label: 'Cotisation car / déplacement', montant: 0, sort_order: 3 },
  { code: 'pull', label: 'Cotisation pull de club', montant: 0, sort_order: 4 },
  { code: 'robot', label: 'Cotisation robot', montant: 0, sort_order: 5 },
  { code: 'evenement', label: 'Cotisation événement', montant: 0, sort_order: 6 },
];

async function tableExists(table) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return Number(rows[0].c) > 0;
}

async function hasColumn(table, column) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return Number(rows[0].c) > 0;
}

(async () => {
  try {
    if (!(await tableExists('finance_cotisation_types'))) {
      await pool.query(`
        CREATE TABLE finance_cotisation_types (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          code VARCHAR(40) NOT NULL,
          label VARCHAR(120) NOT NULL,
          montant_defaut DECIMAL(10,2) NOT NULL DEFAULT 0,
          actif TINYINT(1) NOT NULL DEFAULT 1,
          sort_order INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uk_finance_cotisation_code (code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('Created finance_cotisation_types');
    }

    for (const t of DEFAULT_TYPES) {
      await pool.query(
        `INSERT INTO finance_cotisation_types (code, label, montant_defaut, actif, sort_order)
         VALUES (?, ?, ?, 1, ?)
         ON DUPLICATE KEY UPDATE label = VALUES(label)`,
        [t.code, t.label, t.montant, t.sort_order]
      );
    }
    console.log('Seeded cotisation types');

    if (!(await hasColumn('member_payments', 'cotisation_type'))) {
      await pool.query(`
        ALTER TABLE member_payments
        ADD COLUMN cotisation_type VARCHAR(40) NOT NULL DEFAULT 'recrutement' AFTER annee_cotisation,
        ADD INDEX idx_member_payments_type (cotisation_type)
      `);
      console.log('Added member_payments.cotisation_type');
    }

    console.log('cotisation types ready');
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
