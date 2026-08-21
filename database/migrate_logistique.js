const pool = require('../backend/config/db');

async function tableExists(table) {
  const [rows] = await pool.execute(
    `SELECT 1
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
     LIMIT 1`,
    [table]
  );
  return rows.length > 0;
}

async function main() {
  if (!(await tableExists('materiels'))) {
    await pool.execute(`
      CREATE TABLE \`materiels\` (
        \`id\`                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`nom\`                 VARCHAR(200) NOT NULL,
        \`categorie\`           VARCHAR(100) DEFAULT NULL,
        \`description\`         TEXT,
        \`quantite_totale\`     INT UNSIGNED NOT NULL DEFAULT 1,
        \`quantite_disponible\` INT UNSIGNED NOT NULL DEFAULT 1,
        \`etat\`                ENUM(
                                  'disponible',
                                  'emprunte',
                                  'en_reparation',
                                  'hors_service'
                                ) NOT NULL DEFAULT 'disponible',
        \`emplacement\`         VARCHAR(200) DEFAULT NULL,
        \`responsable\`         VARCHAR(150) DEFAULT NULL,
        \`notes\`               TEXT,
        \`created_at\`          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_materiels_etat\` (\`etat\`),
        KEY \`idx_materiels_categorie\` (\`categorie\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Created materiels');
  } else {
    console.log('materiels already exists');
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
