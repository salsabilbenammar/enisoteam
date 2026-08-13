const path = require('path');
const pool = require(path.join(__dirname, '..', 'backend', 'config', 'db'));

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
    if (!(await tableExists('finance_settings'))) {
      await pool.query(`
        CREATE TABLE finance_settings (
          id TINYINT UNSIGNED NOT NULL DEFAULT 1,
          cotisation_montant DECIMAL(10,2) NOT NULL DEFAULT 30.00,
          cotisation_annee YEAR NOT NULL,
          date_echeance DATE NULL,
          devise VARCHAR(8) NOT NULL DEFAULT 'DT',
          updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('Created finance_settings');
    }

    await pool.query(`
      INSERT INTO finance_settings (id, cotisation_montant, cotisation_annee, date_echeance, devise)
      VALUES (1, 30.00, YEAR(CURDATE()), DATE(CONCAT(YEAR(CURDATE()), '-12-31')), 'DT')
      ON DUPLICATE KEY UPDATE id = id
    `);

    if (!(await tableExists('member_payments'))) {
      await pool.query(`
        CREATE TABLE member_payments (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          member_id INT UNSIGNED NOT NULL,
          montant DECIMAL(10,2) NOT NULL,
          date_paiement DATE NOT NULL,
          methode ENUM('especes','cheque','virement','carte') NOT NULL DEFAULT 'especes',
          annee_cotisation YEAR NOT NULL,
          note VARCHAR(500) NULL,
          transaction_id INT UNSIGNED NULL,
          created_by VARCHAR(120) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_member_payments_member (member_id),
          KEY idx_member_payments_annee (annee_cotisation),
          KEY idx_member_payments_date (date_paiement),
          CONSTRAINT fk_member_payments_member
            FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('Created member_payments');
    }

    if (!(await tableExists('finance_transactions'))) {
      await pool.query(`
        CREATE TABLE finance_transactions (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          type ENUM('depense','recette') NOT NULL,
          montant DECIMAL(10,2) NOT NULL,
          categorie VARCHAR(80) NOT NULL,
          date_transaction DATE NOT NULL,
          description TEXT NULL,
          justificatif_path VARCHAR(255) NULL,
          member_payment_id INT UNSIGNED NULL,
          created_by VARCHAR(120) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_finance_tx_type (type),
          KEY idx_finance_tx_cat (categorie),
          KEY idx_finance_tx_date (date_transaction),
          KEY idx_finance_tx_payment (member_payment_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('Created finance_transactions');
    }

    if (!(await tableExists('finance_transaction_logs'))) {
      await pool.query(`
        CREATE TABLE finance_transaction_logs (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          transaction_id INT UNSIGNED NOT NULL,
          action ENUM('create','update','delete') NOT NULL,
          snapshot_json JSON NULL,
          admin_nom VARCHAR(120) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_finance_logs_tx (transaction_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('Created finance_transaction_logs');
    }

    console.log('finance module ready');
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
