/**
 * Migrations critiques pour l’hébergement (idempotentes).
 * À lancer depuis la racine du projet, avec backend/.env configuré :
 *
 *   node database/migrate_production.js
 *
 * Puis (comptes bureau) :
 *   node database/seed_bureau_accounts.js
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = __dirname;
const scripts = [
  'migrate_prospection.js',
  'migrate_audience_membres.js',
  'migrate_training_image.js',
  'migrate_logistique.js',
  'migrate_logistique_emprunts.js',
  'migrate_pv_reunions.js',
  'migrate_stored_files.js',
  'migrate_deplacements.js',
  'migrate_attendance.js',
  'migrate_finance_module.js',
  'migrate_project_steps.js',
  'migrate_project_step_documents.js',
  'migrate_project_publish.js',
  'migrate_project_gallery.js',
  'migrate_project_archive.js',
  'migrate_project_lead.js',
  'migrate_project_photos_supervisors.js',
  'migrate_project_progress.js',
  'migrate_project_participant_fields.js',
];

let failed = 0;
for (const name of scripts) {
  const file = path.join(root, name);
  console.log(`\n── ${name} ──`);
  const result = spawnSync(process.execPath, [file], {
    cwd: path.join(root, '..'),
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`Échec: ${name} (code ${result.status})`);
    failed += 1;
  }
}

console.log('\n══════════════════════════════════════');
if (failed) {
  console.error(`${failed} migration(s) en échec. Vérifiez backend/.env et MySQL.`);
  process.exit(1);
}
console.log('Migrations production OK.');
console.log('Ensuite: node database/seed_bureau_accounts.js');
process.exit(0);
