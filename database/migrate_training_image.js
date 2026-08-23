/**
 * Affiche / image pour les formations.
 * Usage: node database/migrate_training_image.js
 */
const path = require('path');
const pool = require(path.join(__dirname, '..', 'backend', 'config', 'db'));

async function main() {
  const [cols] = await pool.execute(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'trainings'
       AND COLUMN_NAME = 'image'`
  );
  if (cols.length) {
    console.log('trainings.image already exists');
  } else {
    await pool.execute(
      `ALTER TABLE trainings
       ADD COLUMN image VARCHAR(255) NULL AFTER lien`
    );
    console.log('Added trainings.image');
  }
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
