const path = require('path');
const fs = require('fs');
const multer = require('multer');
const storedFiles = require('../services/storedFileService');

const uploadsRoot = path.join(__dirname, '..', 'uploads');
const dirs = [
  'images',
  'cv',
  'board',
  'events',
  'announcements',
  'club',
  'gallery',
  'recruitment',
  'projects',
  'project-members',
  'project-steps',
  'finance',
  'merch',
  'deplacements',
  'pv-reunions',
  'trainings',
  'prospection',
];

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

/** Stockage disque + copie MySQL (survit aux redéploiements Render Free). */
function makeStorage(subfolder) {
  const disk = multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dest = path.join(uploadsRoot, subfolder);
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${unique}${ext}`);
    },
  });

  return {
    _handleFile(req, file, cb) {
      disk._handleFile(req, file, (err, info) => {
        if (err) return cb(err);
        const publicPath = `/uploads/${subfolder}/${info.filename}`;
        storedFiles
          .upsertFromDisk(publicPath, info.path, {
            mimeType: file.mimetype,
            originalName: file.originalname,
          })
          .then(() => cb(null, info))
          .catch((persistErr) => {
            let size = 0;
            try {
              size = fs.statSync(info.path).size;
            } catch (_) {
              /* ignore */
            }
            // Vidéos > 20 Mo : trop lourdes pour Aiven Free — restent sur disque/git uniquement
            if (size > 20 * 1024 * 1024) {
              console.warn(`[stored-files] skip large file ${publicPath} (${size} bytes)`);
              return cb(null, info);
            }
            console.error(`[stored-files] ${publicPath}:`, persistErr.message);
            fs.unlink(info.path, () => {});
            cb(
              new Error(
                'Impossible d’enregistrer le fichier de façon persistante. Réessayez dans un instant.'
              )
            );
          });
      });
    },
    _removeFile(req, file, cb) {
      disk._removeFile(req, file, (err) => {
        const publicPath = `/uploads/${subfolder}/${file.filename}`;
        storedFiles
          .removeByPath(publicPath)
          .catch(() => {})
          .finally(() => cb(err));
      });
    },
  };
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

function recruitmentFilter(_req, file, cb) {
  if (file.fieldname === 'photo') {
    if (imageMime.has(file.mimetype)) return cb(null, true);
    return cb(new Error('Photo : images uniquement (jpg, png, webp, gif).'));
  }
  if (file.fieldname === 'piece_jointe') {
    if (cvMime.has(file.mimetype) || imageMime.has(file.mimetype)) return cb(null, true);
    return cb(new Error('Pièce jointe : PDF, Word ou image uniquement.'));
  }
  cb(new Error('Champ fichier non autorisé.'));
}

const uploadRecruitment = multer({
  storage: makeStorage('recruitment'),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: recruitmentFilter,
}).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'piece_jointe', maxCount: 1 },
]);

function projectMemberPhotoFilter(_req, file, cb) {
  if (file.fieldname === 'photo' || /^photo_\d+$/.test(file.fieldname)) {
    return imageFilter(_req, file, cb);
  }
  return cb(new Error('Champ fichier non autorisé.'));
}

const uploadProjectMemberPhotos = multer({
  storage: makeStorage('project-members'),
  limits: { fileSize: 5 * 1024 * 1024, files: 20 },
  fileFilter: projectMemberPhotoFilter,
}).any();

const stepDocMime = new Set([
  ...cvMime,
  ...imageMime,
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
]);

function stepDocFilter(_req, file, cb) {
  if (stepDocMime.has(file.mimetype)) return cb(null, true);
  cb(
    new Error(
      'Document non autorisé. Formats : PDF, Word, PowerPoint, Excel, image, ZIP ou TXT.'
    )
  );
}

const uploadProjectStepDocument = multer({
  storage: makeStorage('project-steps'),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: stepDocFilter,
}).single('document');

const uploadFinanceJustificatif = multer({
  storage: makeStorage('finance'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: stepDocFilter,
}).single('justificatif');

const uploadPvDocument = multer({
  storage: makeStorage('pv-reunions'),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: stepDocFilter,
}).single('fichier');

module.exports = {
  uploadImage,
  uploadMedia,
  uploadCv,
  uploadRecruitment,
  uploadProjectMemberPhotos,
  uploadProjectStepDocument,
  uploadFinanceJustificatif,
  uploadPvDocument,
  uploadsRoot,
};
