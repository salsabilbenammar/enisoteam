const pool = require('../backend/config/db');

async function hasColumn(column) {
  const [rows] = await pool.execute(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'finance_cotisation_offers'
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [column]
  );
  return rows.length > 0;
}

async function main() {
  if (!(await hasColumn('prix_total'))) {
    await pool.execute(
      'ALTER TABLE finance_cotisation_offers ADD COLUMN prix_total DECIMAL(10,2) NOT NULL DEFAULT 40.00 AFTER description'
    );
  }
  if (!(await hasColumn('photo_url'))) {
    await pool.execute(
      'ALTER TABLE finance_cotisation_offers ADD COLUMN photo_url VARCHAR(500) NULL AFTER prix_total'
    );
  }
  if (!(await hasColumn('photo_back_url'))) {
    await pool.execute(
      'ALTER TABLE finance_cotisation_offers ADD COLUMN photo_back_url VARCHAR(500) NULL AFTER photo_url'
    );
  }

  await pool.execute(
    `UPDATE finance_cotisation_offers
     SET prix_total = 40.00
     WHERE cotisation_type = 'pull' AND (prix_total IS NULL OR prix_total <= 0)`
  );
  await pool.execute(
    `UPDATE finance_cotisation_interests
     SET statut_commande = 'confirmee'
     WHERE statut_commande = 'acompte_paye'`
  );
  console.log('Merchandise catalog migration complete');
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
