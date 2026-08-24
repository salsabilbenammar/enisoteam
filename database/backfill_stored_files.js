/**
 * Importe les fichiers locaux backend/uploads vers stored_files (Aiven).
 * Usage: node database/backfill_stored_files.js
 * Option: node database/backfill_stored_files.js pv-reunions
 */
const fs = require('fs');
const path = require('path');
const pool = require('../backend/config/db');
const { upsertFromDisk, ensureTable } = require('../backend/services/storedFileService');

const uploadsRoot = path.join(__dirname, '..', 'backend', 'uploads');
const mimeByExt = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.zip': 'application/zip',
  '.txt': 'text/plain',
};

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

async function main() {
  await ensureTable();
  const only = process.argv[2] || null;
  const root = only ? path.join(uploadsRoot, only) : uploadsRoot;
  const files = walk(root);
  let ok = 0;
  let fail = 0;
  let skip = 0;

  for (const abs of files) {
    const rel = path.relative(uploadsRoot, abs).split(path.sep).join('/');
    if (!rel || rel.startsWith('..')) {
      skip += 1;
      continue;
    }
    const publicPath = `/uploads/${rel}`;
    const ext = path.extname(abs).toLowerCase();
    const size = fs.statSync(abs).size;
    // Vidéos très lourdes : garder en git/disque ; éviter de saturer Aiven Free
    if (size > 20 * 1024 * 1024) {
      console.log(`skip (>20Mo) ${publicPath}`);
      skip += 1;
      continue;
    }
    try {
      await upsertFromDisk(publicPath, abs, {
        mimeType: mimeByExt[ext] || 'application/octet-stream',
        originalName: path.basename(abs),
      });
      ok += 1;
      console.log(`ok ${publicPath} (${Math.round(size / 1024)} Ko)`);
    } catch (err) {
      fail += 1;
      console.error(`fail ${publicPath}: ${err.message}`);
    }
  }

  console.log(`Done. ok=${ok} fail=${fail} skip=${skip}`);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
