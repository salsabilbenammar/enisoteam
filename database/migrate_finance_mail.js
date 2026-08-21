const pool = require('../backend/config/db');

async function columnExists(table, column) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function main() {
  if (!(await columnExists('finance_settings', 'mail_paiement_sujet'))) {
    await pool.execute(
      `ALTER TABLE finance_settings
       ADD COLUMN mail_paiement_sujet VARCHAR(255) DEFAULT NULL AFTER devise`
    );
    console.log('Added finance_settings.mail_paiement_sujet');
  }
  if (!(await columnExists('finance_settings', 'mail_paiement_corps'))) {
    await pool.execute(
      `ALTER TABLE finance_settings
       ADD COLUMN mail_paiement_corps TEXT DEFAULT NULL AFTER mail_paiement_sujet`
    );
    console.log('Added finance_settings.mail_paiement_corps');
  }
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
