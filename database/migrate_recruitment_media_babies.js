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

async function addColumn(table, column, ddl) {
  if (await hasColumn(table, column)) {
    console.log(`${table}.${column} already exists`);
    return;
  }
  await pool.query(ddl);
  console.log(`Added ${table}.${column}`);
}

(async () => {
  try {
    await addColumn(
      'recruitment_candidates',
      'stream',
      `ALTER TABLE recruitment_candidates
       ADD COLUMN stream VARCHAR(32) NOT NULL DEFAULT 'general' AFTER statut,
       ADD INDEX idx_recruitment_candidates_stream (stream)`
    );

    await addColumn(
      'recruitment_slots',
      'stream',
      `ALTER TABLE recruitment_slots
       ADD COLUMN stream VARCHAR(32) NOT NULL DEFAULT 'general' AFTER lieu,
       ADD INDEX idx_recruitment_slots_stream (stream)`
    );

    try {
      await pool.query('ALTER TABLE recruitment_slots DROP INDEX uk_slot_datetime');
      console.log('Dropped uk_slot_datetime');
    } catch (e) {
      console.log('uk_slot_datetime:', e.message);
    }
    try {
      await pool.query(
        `ALTER TABLE recruitment_slots
         ADD UNIQUE KEY uk_slot_datetime_stream (date_slot, heure_slot, stream)`
      );
      console.log('Added uk_slot_datetime_stream');
    } catch (e) {
      console.log('uk_slot_datetime_stream:', e.message);
    }

    await addColumn(
      'recruitment_settings',
      'candidature_ouverte_media',
      `ALTER TABLE recruitment_settings
       ADD COLUMN candidature_ouverte_media TINYINT(1) NOT NULL DEFAULT 0 AFTER candidature_ouverte`
    );
    await addColumn(
      'recruitment_settings',
      'mail_media_confirmation_sujet',
      `ALTER TABLE recruitment_settings
       ADD COLUMN mail_media_confirmation_sujet VARCHAR(255) NULL AFTER mail_paiement_corps`
    );
    await addColumn(
      'recruitment_settings',
      'mail_media_confirmation_corps',
      `ALTER TABLE recruitment_settings
       ADD COLUMN mail_media_confirmation_corps TEXT NULL`
    );
    await addColumn(
      'recruitment_settings',
      'mail_media_reussite_sujet',
      `ALTER TABLE recruitment_settings
       ADD COLUMN mail_media_reussite_sujet VARCHAR(255) NULL`
    );
    await addColumn(
      'recruitment_settings',
      'mail_media_reussite_corps',
      `ALTER TABLE recruitment_settings
       ADD COLUMN mail_media_reussite_corps TEXT NULL`
    );

    console.log('recruitment media babies ready');
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
