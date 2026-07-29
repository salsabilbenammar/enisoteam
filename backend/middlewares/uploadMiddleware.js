const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadsRoot = path.join(__dirname, '..', 'uploads');
const dirs = ['images', 'cv', 'board', 'events', 'announcements', 'club', 'gallery'];

dirs.forEach((dir) => {
  const full = path.join(uploadsRoot, dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

const imageMime = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);
const videoMime = new Set(['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']);
const mediaMime = new Set([...imageMime, ...videoMime]);
const cvMime = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function makeStorage(subfolder) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(uploadsRoot, subfolder));
    },
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${unique}${ext}`);
    },
  });
}

function imageFilter(_req, file, cb) {
  if (imageMime.has(file.mimetype)) cb(null, true);
  else cb(new Error('Type de fichier non autorisé. Images uniquement (jpg, png, webp, gif).'));
}

function mediaFilter(_req, file, cb) {
  if (mediaMime.has(file.mimetype)) cb(null, true);
  else {
    cb(
      new Error(
        'Type de fichier non autorisé. Images (jpg, png, webp, gif) ou vidéos (mp4, webm, mov).'
      )
    );
  }
}

function cvFilter(_req, file, cb) {
  if (cvMime.has(file.mimetype)) cb(null, true);
  else cb(new Error('Type de fichier non autorisé. CV : PDF ou Word uniquement.'));
}

const uploadImage = (subfolder) =>
  multer({
    storage: makeStorage(subfolder),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFilter,
  });

const uploadMedia = (subfolder) =>
  multer({
    storage: makeStorage(subfolder),
    limits: { fileSize: 40 * 1024 * 1024 },
    fileFilter: mediaFilter,
  });

const uploadCv = multer({
  storage: makeStorage('cv'),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: cvFilter,
});

module.exports = { uploadImage, uploadMedia, uploadCv, uploadsRoot };
