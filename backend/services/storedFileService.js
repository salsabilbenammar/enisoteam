/**
 * Persistance des uploads dans MySQL (Aiven) pour survivre au disque éphémère Render Free.
 * Chemin public inchangé : /uploads/...
 */
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

let ensured = false;

async function ensureTable() {
  if (ensured) return;
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS stored_files (
      id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
      path          VARCHAR(512) NOT NULL,
      mime_type     VARCHAR(120) DEFAULT NULL,
      original_name VARCHAR(255) DEFAULT NULL,
      size_bytes    INT UNSIGNED NOT NULL DEFAULT 0,
      data          LONGBLOB NOT NULL,
      updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_stored_files_path (path)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  ensured = true;
}

/**
 * @param {string} publicPath ex. /uploads/pv-reunions/xxx.pdf
 * @param {Buffer} data
 * @param {{ mimeType?: string, originalName?: string }} meta
 */
async function upsertBuffer(publicPath, data, meta = {}) {
  if (!publicPath || !Buffer.isBuffer(data) || data.length === 0) return;
  await ensureTable();
  const mime = meta.mimeType || null;
  const original = meta.originalName || null;
  const size = data.length;
  await pool.execute(
    `INSERT INTO stored_files (path, mime_type, original_name, size_bytes, data)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       mime_type = VALUES(mime_type),
       original_name = VALUES(original_name),
       size_bytes = VALUES(size_bytes),
       data = VALUES(data)`,
    [publicPath, mime, original, size, data]
  );
}

async function upsertFromDisk(publicPath, absolutePath, meta = {}) {
  const data = await fs.promises.readFile(absolutePath);
  await upsertBuffer(publicPath, data, meta);
}

async function getByPath(publicPath) {
  await ensureTable();
  const [rows] = await pool.execute(
    `SELECT path, mime_type, original_name, size_bytes, data
     FROM stored_files WHERE path = ? LIMIT 1`,
    [publicPath]
  );
  return rows[0] || null;
}

async function removeByPath(publicPath) {
  await ensureTable();
  await pool.execute(`DELETE FROM stored_files WHERE path = ?`, [publicPath]);
}

/**
 * Après un upload multer (disk), copie vers MySQL.
 * Accepte req.file ou req.files (array / fields object).
 */
async function persistMulterUpload(req, subfolderHint) {
  const items = [];
  if (req.file) items.push(req.file);
  if (Array.isArray(req.files)) items.push(...req.files);
  else if (req.files && typeof req.files === 'object') {
    for (const list of Object.values(req.files)) {
      if (Array.isArray(list)) items.push(...list);
    }
  }

  for (const file of items) {
    if (!file?.path || !file?.filename) continue;
    const folder =
      subfolderHint ||
      path.basename(path.dirname(file.path)) ||
      'misc';
    const publicPath = `/uploads/${folder}/${file.filename}`;
    try {
      await upsertFromDisk(publicPath, file.path, {
        mimeType: file.mimetype,
        originalName: file.originalname,
      });
    } catch (err) {
      console.error(`[stored-files] échec persist ${publicPath}:`, err.message);
    }
  }
}

function wrapUpload(middleware, subfolderHint) {
  return (req, res, next) => {
    middleware(req, res, async (err) => {
      if (err) return next(err);
      try {
        await persistMulterUpload(req, subfolderHint);
      } catch (e) {
        console.error('[stored-files]', e.message);
      }
      next();
    });
  };
}

module.exports = {
  ensureTable,
  upsertBuffer,
  upsertFromDisk,
  getByPath,
  removeByPath,
  persistMulterUpload,
  wrapUpload,
};
