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
    if (!(await hasColumn('project_catalog', 'gallery'))) {
      await pool.query(
        `ALTER TABLE project_catalog
         ADD COLUMN gallery TEXT NULL DEFAULT NULL AFTER image`
      );
      console.log('Added project_catalog.gallery');
    } else {
      console.log('project_catalog.gallery already exists');
    }
    console.log('project gallery ready');
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
