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

(async () => {
  try {
    if (!(await hasColumn('member_payments', 'detail_nom'))) {
      await pool.query(
        `ALTER TABLE member_payments
         ADD COLUMN detail_nom VARCHAR(255) NULL AFTER cotisation_type`
      );
      console.log('Added detail_nom');
    }
    if (!(await hasColumn('member_payments', 'detail_option'))) {
      await pool.query(
        `ALTER TABLE member_payments
         ADD COLUMN detail_option VARCHAR(40) NULL AFTER detail_nom`
      );
      console.log('Added detail_option');
    }
    console.log('payment details ready');
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
