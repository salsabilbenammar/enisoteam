/**
 * Vérifie / teste l'export Google Sheets (webhook Apps Script ou compte de service).
 * Usage: npm run sheets:check
 *        npm run sheets:test
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const sheets = require('../services/googleSheetsService');

async function main() {
  const doWrite = process.argv.includes('--write');
  console.log('=== Google Sheets — diagnostic ENISO Team ===\n');
  console.log('SPREADSHEET_ID :', process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '(manquant)');
  console.log('WEBHOOK_URL    :', process.env.GOOGLE_SHEETS_WEBHOOK_URL || '(manquant)');
  console.log('Config OK?     :', sheets.isConfigured() ? 'OUI' : 'NON');

  if (!sheets.isConfigured()) {
    console.log(`
Il reste 1 action manuelle (Google bloque l'automatisation complète) :

1. Ouvrez votre Sheet
2. Extensions → Apps Script
3. Collez le fichier: backend/google-apps-script/Code.gs
4. Déployer → Application Web → accès "Tout le monde"
5. Renvoyez l'URL .../exec dans le chat
`);
    process.exit(1);
  }

  if (!doWrite) {
    console.log('\nConfig OK. Relancez avec --write pour un test.');
    process.exit(0);
  }

  const result = await sheets.appendPaidCandidate({
    id: 0,
    nom: 'Test',
    prenom: 'ENISO',
    email: 'test@eniso-team.local',
    telephone: '00000000',
    filiere: 'Info',
    annee: '1',
    domaine_interet: 'Robotique',
    date_slot: new Date(),
    heure_slot: '10:00:00',
    facebook_link: '',
  });

  if (result.synced) {
    console.log('\nSUCCÈS — ligne de test ajoutée (via', result.via + ').');
  } else {
    console.error('\nÉCHEC —', result.error || result.reason);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
