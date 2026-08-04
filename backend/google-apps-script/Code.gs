/**
 * ENISO Team — réception des candidats (paiement confirmé)
 * 1. Dans le Google Sheet: Extensions → Apps Script
 * 2. Effacez le contenu par défaut et collez TOUT ce fichier
 * 3. Enregistrer (Ctrl+S)
 * 4. Déployer → Nouveau déploiement → type "Application Web"
 *    - Description: ENISO recrutement
 *    - Exécuter en tant que: Moi
 *    - Qui a accès: Tout le monde
 * 5. Autoriser l'accès Google
 * 6. Copiez l'URL (/macros/s/.../exec) et envoyez-la à Cursor
 *    ou mettez-la dans backend/.env : GOOGLE_SHEETS_WEBHOOK_URL=...
 */

const WEBHOOK_SECRET = '0c68d7adb8e24a73bb58d18195a1553e';
const SHEET_NAME = 'Candidats';

const HEADERS = [
  'Date paiement confirmé',
  'Nom',
  'Prénom',
  'Email',
  'Téléphone',
  'Filière',
  'Année',
  "Domaine d'intérêt",
  'Date entretien',
  'Heure entretien',
  'Facebook',
  'ID candidat',
];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.secret !== WEBHOOK_SECRET) {
      return json_({ ok: false, error: 'unauthorized' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    }

    const row = body.row;
    if (!Array.isArray(row) || row.length === 0) {
      return json_({ ok: false, error: 'row_required' });
    }

    sheet.appendRow(row);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json_({ ok: true, service: 'eniso-recruitment-sheets' });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
