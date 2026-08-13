const path = require('path');
const pool = require(path.join(__dirname, '..', 'backend', 'config', 'db'));

async function hasColumn(table, column) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return Number(rows[0].c) > 0;
}

async function tableExists(table) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return Number(rows[0].c) > 0;
}

(async () => {
  try {
    if (!(await tableExists('finance_cotisation_offers'))) {
      await pool.query(`
        CREATE TABLE finance_cotisation_offers (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          cotisation_type VARCHAR(40) NOT NULL,
          titre VARCHAR(200) NOT NULL,
          description TEXT NULL,
          ouvert TINYINT(1) NOT NULL DEFAULT 1,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_finance_offers_type (cotisation_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('Created finance_cotisation_offers');
    }

    if (!(await tableExists('finance_cotisation_interests'))) {
      await pool.query(`
        CREATE TABLE finance_cotisation_interests (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          offer_id INT UNSIGNED NOT NULL,
          member_id INT UNSIGNED NULL,
          prenom VARCHAR(100) NOT NULL,
          nom VARCHAR(100) NOT NULL,
          email VARCHAR(150) NOT NULL,
          telephone VARCHAR(40) NULL,
          detail_option VARCHAR(40) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uk_offer_email (offer_id, email),
          KEY idx_interests_member (member_id),
          CONSTRAINT fk_interest_offer FOREIGN KEY (offer_id)
            REFERENCES finance_cotisation_offers(id) ON DELETE CASCADE,
          CONSTRAINT fk_interest_member FOREIGN KEY (member_id)
            REFERENCES members(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('Created finance_cotisation_interests');
    }

    if (!(await hasColumn('member_payments', 'detail_ref_id'))) {
      await pool.query(`
        ALTER TABLE member_payments
        ADD COLUMN detail_ref_id INT UNSIGNED NULL AFTER detail_option
      `);
      console.log('Added detail_ref_id');
    }

    console.log('cotisation offers ready');
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
