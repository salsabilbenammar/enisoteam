const jwt = require('jsonwebtoken');
const {
  BUREAU_ROLES,
  isBureauRole,
  normalizeBureauRole,
  canWriteModule,
  roleLabel,
} = require('../services/bureauPermissions');

function verifyToken(req, res) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token manquant. Authentification requise.' });
    return null;
  }

  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    res.status(401).json({ message: 'Token invalide ou expiré.' });
    return null;
  }
}

function attachBureau(req, decoded) {
  req.user = decoded;
  if (isBureauRole(decoded.role)) req.admin = decoded;
}

function authMiddleware(req, res, next) {
  const decoded = verifyToken(req, res);
  if (!decoded) return;
  attachBureau(req, decoded);
  next();
}

/** Lecture back-office — tous les comptes bureau */
function requireAdmin(req, res, next) {
  const decoded = verifyToken(req, res);
  if (!decoded) return;
  if (!isBureauRole(decoded.role)) {
    return res.status(403).json({ message: 'Accès réservé aux comptes du bureau.' });
  }
  attachBureau(req, decoded);
  next();
}

/** Écriture d’un module précis (président = tout) */
function requireModuleWrite(module) {
  return function moduleWriteGuard(req, res, next) {
    const decoded = verifyToken(req, res);
    if (!decoded) return;
    if (!isBureauRole(decoded.role)) {
      return res.status(403).json({ message: 'Accès réservé aux comptes du bureau.' });
    }
    if (!canWriteModule(decoded.role, module)) {
      return res.status(403).json({
        message:
          'Lecture seule : vous pouvez consulter cette section, mais pas la modifier.',
      });
    }
    attachBureau(req, decoded);
    next();
  };
}

const requireRhWrite = requireModuleWrite('rh');
const requireAdminWrite = requireModuleWrite('members');

function requireMember(req, res, next) {
  const decoded = verifyToken(req, res);
  if (!decoded) return;
  if (decoded.role !== 'member' && !isBureauRole(decoded.role)) {
    return res.status(403).json({ message: 'Accès réservé aux membres inscrits du club.' });
  }
  attachBureau(req, decoded);
  next();
}

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      attachBureau(req, decoded);
    } catch {
      // ignore
    }
  }
  next();
}

function isClubMember(user) {
  return user && (user.role === 'member' || isBureauRole(user.role));
}

/** Contenu réservé aux membres : visible si connecté membre/bureau. */
function canViewMembersContent(user) {
  return isClubMember(user);
}

function filterByAudience(items, user) {
  const list = Array.isArray(items) ? items : [];
  if (canViewMembersContent(user)) return list;
  return list.filter((item) => item.audience !== 'membres');
}

function normalizeAudience(raw) {
  return String(raw || '').trim() === 'membres' ? 'membres' : 'public';
}

function filterTrainingForPublic(training) {
  const { lien, ...publicFields } = training;
  return { ...publicFields, acces_membre: !!lien };
}

module.exports = authMiddleware;
module.exports.requireAdmin = requireAdmin;
module.exports.requireModuleWrite = requireModuleWrite;
module.exports.requireRhWrite = requireRhWrite;
module.exports.requireAdminWrite = requireAdminWrite;
module.exports.requireMember = requireMember;
module.exports.optionalAuth = optionalAuth;
module.exports.isClubMember = isClubMember;
module.exports.canViewMembersContent = canViewMembersContent;
module.exports.filterByAudience = filterByAudience;
module.exports.normalizeAudience = normalizeAudience;
module.exports.filterTrainingForPublic = filterTrainingForPublic;
module.exports.isBureauRole = isBureauRole;
module.exports.normalizeBureauRole = normalizeBureauRole;
module.exports.canWriteModule = canWriteModule;
module.exports.BUREAU_ROLES = BUREAU_ROLES;
module.exports.roleLabel = roleLabel;
