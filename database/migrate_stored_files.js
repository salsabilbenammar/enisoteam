/**
 * Table stored_files : blobs persistants (Render Free = disque éphémère).
 * Usage: node database/migrate_stored_files.js
 */
const pool = require('../backend/config/db');
const { ensureTable } = require('../backend/services/storedFileService');

async function main() {
  await ensureTable();
  console.log('stored_files OK');
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
