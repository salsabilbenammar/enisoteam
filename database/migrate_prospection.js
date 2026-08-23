/**
 * Table réalisations prospection.
 * Usage: node database/migrate_prospection.js
 */
const path = require('path');
const pool = require(path.join(__dirname, '..', 'backend', 'config', 'db'));

async function main() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS prospection_realizations (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      titre VARCHAR(200) NOT NULL,
      description TEXT NULL,
      annee SMALLINT UNSIGNED NULL,
      image VARCHAR(255) NULL,
      ordre_affichage INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_prospection_ordre (ordre_affichage, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('Table prospection_realizations OK');
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
