/**
 * Accès bureau ENISO Team — chaque poste modifie son périmètre,
 * le président (admin) modifie tout, les autres voient en lecture seule.
 */

const BUREAU_ROLES = [
  'admin', // Président — accès total
  'rh',
  'secretaire',
  'projets',
  'tresorier',
  'logistique',
  'evenementiel',
  'media',
  'prospection',
];

const ROLE_LABELS = {
  admin: 'Président',
  rh: 'Responsable RH',
  secretaire: 'Secrétaire générale',
  projets: 'Responsable projets',
  tresorier: 'Trésorier',
  logistique: 'Responsable logistique',
  evenementiel: 'Responsable événementiel',
  media: 'Responsable média',
  prospection: 'Responsable prospection',
};

/** module → rôles autorisés à écrire (admin toujours inclus) */
const MODULE_WRITERS = {
  announcements: ['admin', 'secretaire'],
  deplacements: ['admin', 'secretaire'],
  pv_reunions: ['admin', 'secretaire'],
  rh: ['admin', 'rh'],
  trainings: ['admin', 'rh'],
  recruitment: ['admin', 'rh'],
  attendance: ['admin', 'rh'],
  projects: ['admin', 'projets'],
  finance: ['admin', 'tresorier'],
  logistique: ['admin', 'logistique'],
  events: ['admin', 'evenementiel'],
  club_info: ['admin', 'media'],
  contact: ['admin', 'media'],
  board: [
    'admin',
    'rh',
    'secretaire',
    'projets',
    'tresorier',
    'logistique',
    'evenementiel',
    'media',
    'prospection',
  ],
  gallery: ['admin', 'media'],
  prospection: ['admin', 'prospection'],
  members: ['admin'],
  site_settings: ['admin', 'media'],
};

function isBureauRole(role) {
  return BUREAU_ROLES.includes(role);
}

function normalizeBureauRole(role) {
  if (BUREAU_ROLES.includes(role)) return role;
  return 'admin';
}

function canWriteModule(role, module) {
  if (role === 'admin') return true;
  const allowed = MODULE_WRITERS[module];
  if (!allowed) return false;
  return allowed.includes(role);
}

function roleLabel(role) {
  return ROLE_LABELS[role] || role || 'Bureau';
}

module.exports = {
  BUREAU_ROLES,
  ROLE_LABELS,
  MODULE_WRITERS,
  isBureauRole,
  normalizeBureauRole,
  canWriteModule,
  roleLabel,
};
