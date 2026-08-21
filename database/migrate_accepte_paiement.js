const pool = require('../backend/config/db');

async function main() {
  const [rows] = await pool.execute(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'finance_cotisation_interests'
       AND COLUMN_NAME = 'accepte_paiement'
     LIMIT 1`
  );
  if (!rows.length) {
    await pool.execute(
      `ALTER TABLE finance_cotisation_interests
       ADD COLUMN accepte_paiement TINYINT(1) NOT NULL DEFAULT 0 AFTER acompte`
    );
    console.log('Added accepte_paiement');
  } else {
    console.log('accepte_paiement already exists');
  }
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
