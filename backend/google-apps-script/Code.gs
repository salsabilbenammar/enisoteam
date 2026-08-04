/**
 * ENISO Team — réception / suppression des candidats (Google Sheet)
 * 1. Dans le Google Sheet: Extensions → Apps Script
 * 2. Effacez le contenu par défaut et collez TOUT ce fichier
 * 3. Enregistrer (Ctrl+S)
 * 4. Déployer → Nouveau déploiement → type "Application Web"
 *    - Description: ENISO recrutement
 *    - Exécuter en tant que: Moi
 *    - Qui a accès: Tout le monde
 * 5. Autoriser l'accès Google
 * 6. Copiez l'URL (/macros/s/.../exec) dans backend/.env :
 *    GOOGLE_SHEETS_WEBHOOK_URL=...
 *
 * Après toute modification de ce script : Déployer → Gérer les déploiements
 * → Modifier (crayon) → Nouvelle version → Déployer.
 */

const WEBHOOK_SECRET = '0c68d7adb8e24a73bb58d18195a1553e';
const SHEET_NAME = 'Candidats';
/** Colonne L = index 12 (1-based) : ID candidat */
const ID_COLUMN = 12;

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

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.secret !== WEBHOOK_SECRET) {
      return json_({ ok: false, error: 'unauthorized' });
    }

    const action = body.action || (body.row ? 'append' : '');
    if (action === 'delete') {
      return handleDelete_(body);
    }
    return handleAppend_(body);
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function handleAppend_(body) {
  const sheet = getSheet_();
  const row = body.row;
  if (!Array.isArray(row) || row.length === 0) {
    return json_({ ok: false, error: 'row_required' });
  }
  sheet.appendRow(row);
  return json_({ ok: true });
}

function handleDelete_(body) {
  const candidateId = String(body.candidateId || body.id || '').trim();
  if (!candidateId) {
    return json_({ ok: false, error: 'candidateId_required' });
  }

  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return json_({ ok: true, deleted: 0 });
  }

  const values = sheet.getRange(2, ID_COLUMN, lastRow, ID_COLUMN).getValues();
  let deleted = 0;
  // Supprimer du bas vers le haut pour ne pas décaler les indices
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (String(values[i][0]).trim() === candidateId) {
      sheet.deleteRow(i + 2);
      deleted += 1;
    }
  }
  return json_({ ok: true, deleted: deleted });
}

function doGet() {
  return json_({ ok: true, service: 'eniso-recruitment-sheets' });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
