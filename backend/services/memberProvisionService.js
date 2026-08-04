const crypto = require('crypto');
const bcrypt = require('bcrypt');
const memberModel = require('../models/memberModel');

function generateTemporaryPassword(length = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

/**
 * Crée ou met à jour le compte membre avec un mot de passe aléatoire.
 * Le mot de passe temporaire est toujours renvoyé pour l'email de paiement.
 */
async function provisionMemberFromCandidate(candidate) {
  const email = String(candidate.email || '').trim().toLowerCase();
  const nom = `${candidate.prenom || ''} ${candidate.nom || ''}`.trim() || email;
  const filiere = candidate.filiere || null;

  if (!email) {
    const err = new Error('Email candidat manquant pour créer le compte membre.');
    err.status = 400;
    throw err;
  }

  const temporaryPassword = generateTemporaryPassword(12);
  const password_hash = await bcrypt.hash(temporaryPassword, 10);
  const existing = await memberModel.findByEmail(email);

  if (existing) {
    const member = await memberModel.update(existing.id, {
      nom: nom || existing.nom,
      email,
      filiere: filiere !== undefined ? filiere : existing.filiere,
      actif: true,
      password_hash,
    });
    return {
      created: false,
      temporaryPassword,
      member,
      email,
    };
  }

  const member = await memberModel.create({
    nom,
    email,
    password_hash,
    filiere,
    actif: true,
  });

  return {
    created: true,
    temporaryPassword,
    member,
    email,
  };
}

module.exports = {
  generateTemporaryPassword,
  provisionMemberFromCandidate,
};
