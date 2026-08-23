/** Miroir de backend/services/bureauPermissions.js */

export const BUREAU_ROLES = [
  'admin',
  'rh',
  'secretaire',
  'projets',
  'tresorier',
  'logistique',
  'evenementiel',
  'media',
  'prospection',
];

export const ROLE_LABELS = {
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

export function isBureauRole(role) {
  return BUREAU_ROLES.includes(role);
}

export function canWriteModule(role, module) {
  if (role === 'admin') return true;
  const allowed = MODULE_WRITERS[module];
  if (!allowed) return false;
  return allowed.includes(role);
}

export function roleLabel(role) {
  return ROLE_LABELS[role] || role || 'Bureau';
}
