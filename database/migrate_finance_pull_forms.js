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
    if (!(await hasColumn('finance_cotisation_offers', 'detail_option'))) {
      await pool.query(`
        ALTER TABLE finance_cotisation_offers
        ADD COLUMN detail_option VARCHAR(40) NULL AFTER cotisation_type
      `);
      console.log('Added finance_cotisation_offers.detail_option');
    }
    console.log('pull form detail_option ready');
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
