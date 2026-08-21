const jwt = require('jsonwebtoken');

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

function authMiddleware(req, res, next) {
  const decoded = verifyToken(req, res);
  if (!decoded) return;
  req.user = decoded;
  if (decoded.role === 'admin' || decoded.role === 'secretaire') req.admin = decoded;
  next();
}

function requireAdmin(req, res, next) {
  const decoded = verifyToken(req, res);
  if (!decoded) return;
  if (decoded.role !== 'admin' && decoded.role !== 'secretaire') {
    return res.status(403).json({ message: 'Accès réservé aux comptes du bureau.' });
  }
  req.user = decoded;
  req.admin = decoded;
  next();
}

function requireMember(req, res, next) {
  const decoded = verifyToken(req, res);
  if (!decoded) return;
  if (
    decoded.role !== 'member' &&
    decoded.role !== 'admin' &&
    decoded.role !== 'secretaire'
  ) {
    return res.status(403).json({ message: 'Accès réservé aux membres inscrits du club.' });
  }
  req.user = decoded;
  if (decoded.role === 'admin' || decoded.role === 'secretaire') req.admin = decoded;
  next();
}

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      req.user = decoded;
      if (decoded.role === 'admin' || decoded.role === 'secretaire') req.admin = decoded;
    } catch {
      // Token invalide : on continue en visiteur
    }
  }
  next();
}

function isClubMember(user) {
  return user && (
    user.role === 'member' ||
    user.role === 'admin' ||
    user.role === 'secretaire'
  );
}

function filterTrainingForPublic(training) {
  const { lien, ...publicFields } = training;
  return { ...publicFields, acces_membre: !!lien };
}

module.exports = authMiddleware;
module.exports.requireAdmin = requireAdmin;
module.exports.requireMember = requireMember;
module.exports.optionalAuth = optionalAuth;
module.exports.isClubMember = isClubMember;
module.exports.filterTrainingForPublic = filterTrainingForPublic;
