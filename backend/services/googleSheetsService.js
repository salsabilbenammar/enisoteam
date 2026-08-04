const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const HEADERS = [
  'Date paiement confirmé',
  'Nom',
  'Prénom',
  'Email',
  'Téléphone',
  'Filière',
  'Année',
  'Domaine d\'intérêt',
  'Date entretien',
  'Heure entretien',
  'Facebook',
  'ID candidat',
];

function loadCredentials() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? path.isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      ? process.env.GOOGLE_APPLICATION_CREDENTIALS
      : path.join(__dirname, '..', process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : path.join(__dirname, '..', 'credentials', 'google-service-account.json');

  if (fs.existsSync(credPath)) {
    return JSON.parse(fs.readFileSync(credPath, 'utf8'));
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  return null;
}

function isConfigured() {
  if (process.env.GOOGLE_SHEETS_WEBHOOK_URL) return true;
  const sheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!sheetId) return false;
  try {
    return Boolean(loadCredentials());
  } catch {
    return false;
  }
}

async function getSheetsClient() {
  const credentials = loadCredentials();
  if (!credentials) {
    const err = new Error('Identifiants Google Sheets manquants.');
    err.code = 'SHEETS_NOT_CONFIGURED';
    throw err;
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

function formatDay(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString('fr-FR');
}

function formatTime(value) {
  if (!value) return '';
  return String(value).slice(0, 5);
}

function candidateToRow(candidate) {
  const now = new Date().toLocaleString('fr-FR');
  return [
    now,
    candidate.nom || '',
    candidate.prenom || '',
    candidate.email || '',
    candidate.telephone || '',
    candidate.filiere || '',
    candidate.annee || '',
    candidate.domaine_interet || '',
    formatDay(candidate.date_slot),
    formatTime(candidate.heure_slot),
    candidate.facebook_link || '',
    String(candidate.id || ''),
  ];
}

async function ensureHeaderRow(sheets, spreadsheetId, range) {
  const sheetName = String(range).split('!')[0] || 'Sheet1';
  const headerRange = `${sheetName}!A1:L1`;
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: headerRange,
  });
  const first = existing.data.values?.[0];
  if (!first || first.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: headerRange,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });
  }
}

async function appendViaWebhook(candidate) {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const secret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET || '';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret,
      row: candidateToRow(candidate),
    }),
    redirect: 'follow',
  });
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Webhook HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return { synced: true, via: 'webhook' };
}

async function appendViaServiceAccount(candidate) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const range = process.env.GOOGLE_SHEETS_RANGE || 'Candidats!A:L';
  const sheets = await getSheetsClient();
  await ensureHeaderRow(sheets, spreadsheetId, range);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [candidateToRow(candidate)] },
  });
  return { synced: true, via: 'service_account' };
}

/**
 * Ajoute une ligne candidat dans le Google Sheet (paiement confirmé).
 */
async function appendPaidCandidate(candidate) {
  if (!isConfigured()) {
    console.warn('[sheets] Non configuré — export ignoré');
    return { synced: false, skipped: true, reason: 'not_configured' };
  }

  try {
    if (process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
      const result = await appendViaWebhook(candidate);
      console.log(`[sheets] Candidat #${candidate.id} exporté via webhook`);
      return result;
    }
    const result = await appendViaServiceAccount(candidate);
    console.log(`[sheets] Candidat #${candidate.id} exporté via API`);
    return result;
  } catch (err) {
    console.error('[sheets] Erreur export:', err.message);
    return { synced: false, error: err.message };
  }
}

module.exports = {
  isConfigured,
  appendPaidCandidate,
  candidateToRow,
  HEADERS,
};
