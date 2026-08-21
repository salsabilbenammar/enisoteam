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

async function addColumn(name, definition) {
  if (await hasColumn('finance_cotisation_interests', name)) {
    console.log(`${name} already exists`);
    return;
  }
  await pool.execute(
    `ALTER TABLE finance_cotisation_interests ADD COLUMN ${name} ${definition}`
  );
  console.log(`Added ${name}`);
}

async function main() {
  await addColumn('filiere', 'VARCHAR(120) NULL AFTER detail_option');
  await addColumn('taille', 'VARCHAR(10) NULL AFTER filiere');
  await addColumn('prix_total', 'DECIMAL(10,2) NULL AFTER taille');
  await addColumn('acompte', 'DECIMAL(10,2) NULL AFTER prix_total');
  await addColumn(
    'accepte_paiement',
    'TINYINT(1) NOT NULL DEFAULT 0 AFTER acompte'
  );
  await addColumn(
    'statut_commande',
    "VARCHAR(30) NOT NULL DEFAULT 'en_attente' AFTER accepte_paiement"
  );

  await pool.execute(
    `UPDATE finance_cotisation_offers
     SET titre = CASE detail_option
           WHEN 'tshirt' THEN 'T-shirt ENISO Team'
           WHEN 'capuche' THEN 'Hoodie ENISO Team'
           ELSE titre
         END,
         description = CASE detail_option
           WHEN 'tshirt' THEN 'Commande du T-shirt officiel ENISO Team'
           WHEN 'capuche' THEN 'Commande du hoodie officiel ENISO Team'
           ELSE description
         END,
         external_url = CONCAT('/boutique/', detail_option),
         ouvert = 1
     WHERE cotisation_type = 'pull'
       AND detail_option IN ('tshirt', 'capuche')`
  );

  console.log('Merchandise forms ready');
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
