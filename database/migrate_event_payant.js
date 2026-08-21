const pool = require('../backend/config/db');

async function hasColumn(table, column) {
  const [rows] = await pool.execute(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function main() {
  if (!(await hasColumn('events', 'payant'))) {
    await pool.execute(
      `ALTER TABLE events
       ADD COLUMN payant TINYINT(1) NOT NULL DEFAULT 0 AFTER inscription_ouverte`
    );
    console.log('Added events.payant');
  } else {
    console.log('events.payant already exists');
  }

  if (!(await hasColumn('events', 'prix'))) {
    await pool.execute(
      `ALTER TABLE events
       ADD COLUMN prix VARCHAR(50) NULL AFTER payant`
    );
    console.log('Added events.prix');
  } else {
    console.log('events.prix already exists');
  }

  if (!(await hasColumn('event_registrations', 'accepte_paiement'))) {
    await pool.execute(
      `ALTER TABLE event_registrations
       ADD COLUMN accepte_paiement TINYINT(1) NOT NULL DEFAULT 0 AFTER motivation`
    );
    console.log('Added event_registrations.accepte_paiement');
  } else {
    console.log('event_registrations.accepte_paiement already exists');
  }

  if (!(await hasColumn('event_registrations', 'paiement_valide'))) {
    await pool.execute(
      `ALTER TABLE event_registrations
       ADD COLUMN paiement_valide TINYINT(1) NOT NULL DEFAULT 0 AFTER accepte_paiement`
    );
    console.log('Added event_registrations.paiement_valide');
  } else {
    console.log('event_registrations.paiement_valide already exists');
  }

  if (!(await hasColumn('event_registrations', 'paiement_valide_at'))) {
    await pool.execute(
      `ALTER TABLE event_registrations
       ADD COLUMN paiement_valide_at DATETIME NULL DEFAULT NULL AFTER paiement_valide`
    );
    console.log('Added event_registrations.paiement_valide_at');
  } else {
    console.log('event_registrations.paiement_valide_at already exists');
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
