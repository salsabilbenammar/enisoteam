/**
 * Visibilité public vs membres — events + prospection.
 * Usage: node database/migrate_audience_membres.js
 */
const path = require('path');
const pool = require(path.join(__dirname, '..', 'backend', 'config', 'db'));

async function addAudienceColumn(table) {
  const [cols] = await pool.execute(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'audience'`,
    [table]
  );
  if (cols.length) {
    console.log(`${table}.audience already exists`);
    return;
  }
  await pool.execute(
    `ALTER TABLE \`${table}\`
     ADD COLUMN audience ENUM('public', 'membres') NOT NULL DEFAULT 'public'
     AFTER id`
  );
  console.log(`Added ${table}.audience`);
}

async function main() {
  await addAudienceColumn('events');
  await addAudienceColumn('prospection_realizations');
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
