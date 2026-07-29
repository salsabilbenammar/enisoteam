const bcrypt = require('bcrypt');
const memberModel = require('../models/memberModel');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function getAll(_req, res, next) {
  try {
    res.json(await memberModel.getAll());
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const row = await memberModel.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Membre introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { nom, email, password, filiere, actif } = req.body;
    if (!nom || !email || !password) {
      return res.status(400).json({ message: 'Nom, email et mot de passe requis.' });
    }
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Email invalide.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Mot de passe : 6 caractères minimum.' });
    }

    const existing = await memberModel.findByEmail(email.trim().toLowerCase());
    if (existing) {
      return res.status(409).json({ message: 'Un membre avec cet email existe déjà.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const row = await memberModel.create({
      nom: nom.trim(),
      email: email.trim().toLowerCase(),
      password_hash,
      filiere,
      actif,
    });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { nom, email, password, filiere, actif } = req.body;
    if (!nom || !email) {
      return res.status(400).json({ message: 'Nom et email requis.' });
    }
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Email invalide.' });
    }

    const data = {
      nom: nom.trim(),
      email: email.trim().toLowerCase(),
      filiere,
      actif,
    };

    if (password) {
      if (String(password).length < 6) {
        return res.status(400).json({ message: 'Mot de passe : 6 caractères minimum.' });
      }
      data.password_hash = await bcrypt.hash(password, 10);
    }

    const other = await memberModel.findByEmail(data.email);
    if (other && String(other.id) !== String(req.params.id)) {
      return res.status(409).json({ message: 'Un membre avec cet email existe déjà.' });
    }

    const row = await memberModel.update(req.params.id, data);
    if (!row) return res.status(404).json({ message: 'Membre introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const ok = await memberModel.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Membre introuvable.' });
    res.json({ message: 'Membre supprimé.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, create, update, remove };
