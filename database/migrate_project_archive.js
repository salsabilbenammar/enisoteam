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
    if (!(await hasColumn('project_catalog', 'archive_year'))) {
      await pool.query(
        `ALTER TABLE project_catalog
         ADD COLUMN archive_year SMALLINT UNSIGNED NULL DEFAULT NULL AFTER gallery`
      );
      console.log('Added project_catalog.archive_year');
    } else {
      console.log('project_catalog.archive_year already exists');
    }
    console.log('project archive ready');
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
