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
  if (!(await tableExists('materiel_emprunts'))) {
    await pool.execute(`
      CREATE TABLE \`materiel_emprunts\` (
        \`id\`                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`materiel_id\`           INT UNSIGNED NOT NULL,
        \`emprunteur_nom\`        VARCHAR(150) NOT NULL,
        \`emprunteur_email\`      VARCHAR(180) DEFAULT NULL,
        \`emprunteur_telephone\`  VARCHAR(40) DEFAULT NULL,
        \`quantite\`              INT UNSIGNED NOT NULL DEFAULT 1,
        \`date_emprunt\`          DATE NOT NULL,
        \`date_retour_prevue\`    DATE DEFAULT NULL,
        \`date_retour_effectif\`  DATE DEFAULT NULL,
        \`statut\`                ENUM('en_cours', 'retourne') NOT NULL DEFAULT 'en_cours',
        \`notes\`                 TEXT,
        \`created_at\`            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_emprunts_materiel\` (\`materiel_id\`),
        KEY \`idx_emprunts_statut\` (\`statut\`),
        CONSTRAINT \`fk_emprunts_materiel\`
          FOREIGN KEY (\`materiel_id\`) REFERENCES \`materiels\` (\`id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Created materiel_emprunts');
  } else {
    console.log('materiel_emprunts already exists');
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
