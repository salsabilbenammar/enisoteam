const galleryModel = require('../models/galleryModel');

const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.ogg']);

function detectMediaType(file) {
  if (!file) return 'image';
  const name = (file.originalname || file.filename || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();
  if (mime.startsWith('video/') || [...VIDEO_EXT].some((ext) => name.endsWith(ext))) {
    return 'video';
  }
  return 'image';
}

async function getAll(_req, res, next) {
  try {
    res.json(await galleryModel.getAll());
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const row = await galleryModel.getById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Média introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { titre, description, ordre_affichage } = req.body;
    if (!titre) {
      return res.status(400).json({ message: 'Le titre est requis.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Une photo ou une vidéo est requise.' });
    }
    const media_type = detectMediaType(req.file);
    const image = `/uploads/gallery/${req.file.filename}`;
    const row = await galleryModel.create({
      titre,
      description,
      image,
      media_type,
      ordre_affichage: ordre_affichage ? Number(ordre_affichage) : 0,
    });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { titre, description, ordre_affichage } = req.body;
    if (!titre) {
      return res.status(400).json({ message: 'Le titre est requis.' });
    }
    const data = {
      titre,
      description,
      ordre_affichage: ordre_affichage ? Number(ordre_affichage) : 0,
    };
    if (req.file) {
      data.image = `/uploads/gallery/${req.file.filename}`;
      data.media_type = detectMediaType(req.file);
    }
    const row = await galleryModel.update(req.params.id, data);
    if (!row) return res.status(404).json({ message: 'Média introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const ok = await galleryModel.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Média introuvable.' });
    res.json({ message: 'Média supprimé.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, create, update, remove };
