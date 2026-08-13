const path = require('path');
const pool = require(path.join(__dirname, '..', 'backend', 'config', 'db'));
const { ARCHIVE_YEAR, PUBLISHED_AT } = require('./archiveProjectsConfig');

(async () => {
  try {
    const [from2025] = await pool.query(
      `UPDATE project_catalog SET archive_year = ? WHERE archive_year = 2025`,
      [ARCHIVE_YEAR]
    );
    console.log(`project_catalog (2025→${ARCHIVE_YEAR}): ${from2025.affectedRows} ligne(s)`);

    const [forceArchive] = await pool.query(
      `UPDATE project_catalog SET archive_year = ? WHERE archive_year IS NOT NULL AND archive_year <> ?`,
      [ARCHIVE_YEAR, ARCHIVE_YEAR]
    );
    console.log(`project_catalog (force ${ARCHIVE_YEAR}): ${forceArchive.affectedRows} ligne(s)`);

    const [assign2025] = await pool.query(
      `UPDATE project_assignments
       SET published_at = ?
       WHERE progress >= 100
         AND published_at IS NOT NULL
         AND YEAR(published_at) = 2025`,
      [PUBLISHED_AT]
    );
    console.log(`project_assignments (2025→${PUBLISHED_AT}): ${assign2025.affectedRows} ligne(s)`);

    const [rows] = await pool.query(
      `SELECT id, titre, archive_year FROM project_catalog WHERE archive_year IS NOT NULL ORDER BY titre`
    );
    console.log('\nRéalisations archivées :');
    for (const r of rows) {
      console.log(`  - ${r.titre}: ${r.archive_year}`);
    }

    console.log('\narchive year ready');
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
