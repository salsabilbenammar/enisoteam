const pool = require('../backend/config/db');

const DEFAULT_REGLEMENT = `3.2 — Droits et devoirs, comportement des membres

3.2.1. Droits

• Chaque membre a le droit de proposer un projet « innovant » au Bureau Exécutif, présenter son projet, présider son équipe du projet et se bénéficier des formations et matériels exigés après l'approbation du bureau.
• Chaque membre a le droit d'être initié au monde de la robotique et d'avoir le soutien à l'utilisation des matériels.
• Il a le droit de l'utilisation sur place le matériel du club en fonction de sa disponibilité ou l'emprunter après avoir remplir une demande d'emprunt.
• Chaque membre a le droit d'assister aux formations proposées par le responsable formation.
• Chaque membre a le droit de participer aux compétitions nationales de la robotique avec le soutien du club.

3.2.2. Devoirs

• Chaque membre doit impérativement respecter le règlement interne.
• Respecter l'ensemble du matériel du club.
• Veiller à la propreté et à la sécurité du lieu de travail, au rangement du matériel après utilisation.
• Chaque membre doit participer, au moins, à un projet.
• Participer aux activités proposées par le bureau et faire partie du comité organisateur de chaque événement du club, et essentiellement E.S.C.
• Tous les renseignements personnels communiqués au bureau de l'ENISo Team par ses membres restent confidentiels et ne sont en aucun cas communiqués à des tiers.

3.2.3. Comportement des membres

• Chaque membre s'engage à promouvoir la bonne image de l'ENISo Team et il est obligé également par son attitude ou ses déclarations à ne pas nuire à cette image.
• Les membres doivent adopter une attitude sportive et respectueuse envers les autres clubs de notre école ou des autres écoles.
• Tout comportement visant à troubler l'ordre et le bon fonctionnement du club, envers les responsables et/ou les autres adhérents, expose son propriétaire à des sanctions pouvant aller jusqu'à la révocation.
• Le non-respect de la propreté et l'organisation de l'espace du travail et du local expose l'adhérant à des avertissements et des sanctions pouvant aller jusqu'à la révocation.`;

async function hasColumn(column) {
  const [rows] = await pool.execute(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'site_settings'
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [column]
  );
  return rows.length > 0;
}

async function main() {
  if (!(await hasColumn('reglement_interne'))) {
    await pool.execute(
      `ALTER TABLE site_settings
       ADD COLUMN reglement_interne TEXT NULL AFTER merit_rules`
    );
    console.log('Added reglement_interne');
  } else {
    console.log('reglement_interne already exists');
  }

  await pool.execute(
    `UPDATE site_settings
     SET reglement_interne = ?
     WHERE id = 1 AND (reglement_interne IS NULL OR reglement_interne = '')`,
    [DEFAULT_REGLEMENT]
  );
  console.log('Seeded reglement_interne if empty');

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
