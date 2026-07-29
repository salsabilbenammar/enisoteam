const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const adminModel = require('../models/adminModel');
const memberModel = require('../models/memberModel');

/** Session longue : une connexion suffit pour rester reconnu longtemps. */
function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '365d',
  });
}

function tokenPayload(user) {
  return {
    id: user.id,
    nom: user.nom,
    email: user.email,
    role: user.role,
  };
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const admin = await adminModel.findByEmail(normalizedEmail);
    if (admin) {
      const valid = await bcrypt.compare(password, admin.password_hash);
      if (!valid) {
        return res.status(401).json({ message: 'Identifiants incorrects.' });
      }
      const user = {
        id: admin.id,
        nom: admin.nom,
        email: admin.email,
        role: 'admin',
      };
      const token = signToken(tokenPayload(user));
      return res.json({ token, user, admin: user });
    }

    const member = await memberModel.findByEmail(normalizedEmail);
    if (!member) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }
    if (!member.actif) {
      return res.status(403).json({ message: 'Compte membre désactivé. Contactez le bureau.' });
    }

    const valid = await bcrypt.compare(password, member.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    const user = {
      id: member.id,
      nom: member.nom,
      email: member.email,
      role: 'member',
    };
    const token = signToken(tokenPayload(user));
    return res.json({ token, user });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Non authentifié.' });
    }

    let user;

    if (req.user.role === 'admin') {
      const admin = await adminModel.findById(req.user.id);
      if (!admin) return res.status(404).json({ message: 'Admin introuvable.' });
      user = { id: admin.id, nom: admin.nom, email: admin.email, role: 'admin' };
    } else if (req.user.role === 'member') {
      const member = await memberModel.findById(req.user.id);
      if (!member) return res.status(404).json({ message: 'Membre introuvable.' });
      if (!member.actif) {
        return res.status(403).json({ message: 'Compte membre désactivé.' });
      }
      user = {
        id: member.id,
        nom: member.nom,
        email: member.email,
        role: 'member',
        filiere: member.filiere || null,
      };
    } else {
      return res.status(401).json({ message: 'Rôle inconnu.' });
    }

    // Renouvelle le token à chaque visite → session prolongée automatiquement
    const token = signToken(tokenPayload(user));
    return res.json({ ...user, token });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me };
