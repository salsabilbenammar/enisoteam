const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const adminModel = require('../models/adminModel');
const memberModel = require('../models/memberModel');
const { normalizeBureauRole, isBureauRole } = require('../middlewares/authMiddleware');

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

    const admins = await adminModel.findAllByEmail(normalizedEmail);
    for (const admin of admins) {
      const valid = await bcrypt.compare(password, admin.password_hash);
      if (!valid) continue;
      const user = {
        id: admin.id,
        nom: admin.nom,
        email: admin.email,
        role: normalizeBureauRole(admin.role),
      };
      const token = signToken(tokenPayload(user));
      return res.json({ token, user, admin: user });
    }

    if (admins.length) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
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

    if (isBureauRole(req.user.role)) {
      const admin = await adminModel.findById(req.user.id);
      if (!admin) return res.status(404).json({ message: 'Compte bureau introuvable.' });
      user = {
        id: admin.id,
        nom: admin.nom,
        email: admin.email,
        role: normalizeBureauRole(admin.role),
      };
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

async function updateMyProfile(req, res, next) {
  try {
    if (!req.user || req.user.role !== 'member') {
      return res.status(403).json({ message: 'Réservé aux comptes membres.' });
    }
    const { nom, filiere } = req.body;
    if (!nom || !String(nom).trim()) {
      return res.status(400).json({ message: 'Le nom est requis.' });
    }
    const member = await memberModel.findById(req.user.id);
    if (!member) return res.status(404).json({ message: 'Membre introuvable.' });

    const updated = await memberModel.update(member.id, {
      nom: String(nom).trim(),
      email: member.email,
      filiere: filiere !== undefined ? filiere : member.filiere,
      actif: member.actif,
    });

    const user = {
      id: updated.id,
      nom: updated.nom,
      email: updated.email,
      role: 'member',
      filiere: updated.filiere || null,
    };
    const token = signToken(tokenPayload(user));
    res.json({ ...user, token, message: 'Profil mis à jour.' });
  } catch (err) {
    next(err);
  }
}

async function changeMyPassword(req, res, next) {
  try {
    if (!req.user || req.user.role !== 'member') {
      return res.status(403).json({ message: 'Réservé aux comptes membres.' });
    }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Mot de passe actuel et nouveau requis.' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Nouveau mot de passe : 6 caractères minimum.' });
    }

    const member = await memberModel.findByEmail(req.user.email);
    if (!member) return res.status(404).json({ message: 'Membre introuvable.' });
    if (!member.actif) {
      return res.status(403).json({ message: 'Compte membre désactivé.' });
    }

    const valid = await bcrypt.compare(currentPassword, member.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect.' });
    }

    const password_hash = await bcrypt.hash(String(newPassword), 10);
    await memberModel.update(member.id, {
      nom: member.nom,
      email: member.email,
      filiere: member.filiere,
      actif: true,
      password_hash,
    });

    res.json({ message: 'Mot de passe mis à jour.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me, updateMyProfile, changeMyPassword };
