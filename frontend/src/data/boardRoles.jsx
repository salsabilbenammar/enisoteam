export const BOARD_ROLES = [
  {
    key: 'president',
    label: 'Président',
    ordre: 1,
    description:
      'Représente le club, définit la vision stratégique, coordonne le bureau et assure le lien avec l\'administration et les partenaires.',
  },
  {
    key: 'rh_formations',
    label: 'Responsable Ressources Humaines et Formations',
    ordre: 2,
    description:
      'Gère le recrutement et l\'intégration des membres, organise les ateliers techniques, planifie les formations et assure le transfert de compétences au sein du club.',
  },
  {
    key: 'secretaire',
    label: 'Secrétaire Générale',
    ordre: 3,
    description:
      'Rédige les comptes rendus, gère la correspondance officielle et assure le suivi administratif du club.',
  },
  {
    key: 'tresoriere',
    label: 'Trésorière',
    ordre: 4,
    description:
      'Supervise le budget, les dépenses, les recettes et la transparence financière du club.',
  },
  {
    key: 'prospection',
    label: 'Responsable Prospection',
    ordre: 5,
    description:
      'Développe les partenariats, recherche des sponsors et entretient les relations avec les entreprises.',
  },
  {
    key: 'logistique',
    label: 'Responsable Logistique',
    ordre: 6,
    description:
      'Gère le matériel, les locaux, les réservations et l\'organisation pratique des activités du club.',
  },
  {
    key: 'projet',
    label: 'Responsable Projet',
    ordre: 7,
    description:
      'Pilote les projets robotiques, répartit les tâches techniques et assure l\'avancement des réalisations.',
  },
  {
    key: 'evenement',
    label: 'Responsable Événement',
    ordre: 8,
    description:
      'Planifie et coordonne les compétitions, hackathons, journées portes ouvertes et événements du club.',
  },
  {
    key: 'media',
    label: 'Responsable Média',
    ordre: 9,
    description:
      'Gère la communication digitale, les réseaux sociaux, le contenu visuel et la visibilité du club.',
  },
  {
    key: 'qualite',
    label: 'Responsable Qualité',
    ordre: 10,
    description:
      'Assure le suivi qualité des projets et des processus du club, définit les standards et veille à l\'amélioration continue.',
  },
];

export const BOARD_MEMBER_NAMES = {
  president: 'Med Achref Chaouch',
  rh_formations: 'Salsabil Ben Ammar',
  secretaire: 'Maryam Loghmari',
  tresoriere: 'Mariem Moussi',
  prospection: 'Amina Kouki',
  logistique: 'Med Ahmed Souid',
  projet: 'Dhouha Kmala',
  evenement: null,
  media: 'Ghada Abdelwahed',
  qualite: 'Bilel Hlaoui',
};

export function resolveMemberName(roleKey, dbName) {
  if (dbName && dbName.trim().toLowerCase() !== 'à pourvoir') {
    return dbName.trim();
  }
  if (BOARD_MEMBER_NAMES[roleKey]) {
    return BOARD_MEMBER_NAMES[roleKey];
  }
  return 'À pourvoir';
}

/** Photos par défaut (fallback si aucune photo en base) */
export const BOARD_MEMBER_PHOTOS = {
  president: {
    src: '/board/med-achref-chaouch.png',
    position: 'center 15%',
  },
  rh_formations: {
    src: '/board/salsabil-ben-ammar.png',
    position: 'center 18%',
  },
  tresoriere: {
    src: '/board/mariem-moussi.png',
    position: 'center 12%',
  },
  prospection: {
    src: '/board/amina-kouki.png',
    position: 'center 20%',
  },
  logistique: {
    src: '/board/med-ahmed-souid.png',
    position: 'center 18%',
  },
  secretaire: {
    src: '/board/maryam-loghmari.png',
    position: 'center 15%',
  },
  projet: {
    src: '/board/dhouha-kmala.png',
    position: 'center 20%',
  },
  media: {
    src: '/board/ghada-abdelwahed.png',
    position: 'center 18%',
  },
  qualite: {
    src: '/board/bilel-hlaoui.png',
    position: 'center 18%',
  },
};

export function resolveMemberPhoto(roleKey, dbPhoto) {
  if (dbPhoto) {
    return { src: dbPhoto, position: 'center 18%', fromApi: true };
  }
  if (BOARD_MEMBER_PHOTOS[roleKey]) {
    return { ...BOARD_MEMBER_PHOTOS[roleKey], fromApi: false };
  }
  return null;
}

export function mergeBoardMembers(members) {
  const byRoleKey = new Map();

  members.forEach((member) => {
    const role = findRoleByPoste(member.poste);
    if (!role) return;

    const current = byRoleKey.get(role.key);
    const memberVacant = !member.nom || member.nom.trim().toLowerCase() === 'à pourvoir';
    const currentVacant = !current?.nom || current.nom.trim().toLowerCase() === 'à pourvoir';

    if (!current || (currentVacant && !memberVacant)) {
      byRoleKey.set(role.key, { ...member, poste: role.label, roleKey: role.key });
    }
  });

  return BOARD_ROLES.map((role) => {
    const existing = byRoleKey.get(role.key);

    if (existing) {
      return {
        ...existing,
        roleKey: role.key,
        poste: role.label,
        description: existing.description || role.description,
        nom: resolveMemberName(role.key, existing.nom),
        photoConfig: resolveMemberPhoto(role.key, existing.photo),
      };
    }

    return {
      id: `role-${role.key}`,
      roleKey: role.key,
      nom: resolveMemberName(role.key, null),
      poste: role.label,
      photo: null,
      photoConfig: resolveMemberPhoto(role.key, null),
      description: role.description,
      email: null,
      telephone: null,
      facebook: null,
      ordre_affichage: role.ordre,
    };
  });
}

const LEGACY_POSTE_MAP = {
  'responsable ressources humaines': 'rh_formations',
  'responsable formations': 'rh_formations',
  'responsable ressources humaines et formations': 'rh_formations',
};

export function findRoleByPoste(poste) {
  if (!poste) return null;
  const normalized = poste.trim().toLowerCase();
  const legacyKey = LEGACY_POSTE_MAP[normalized];
  if (legacyKey) {
    return BOARD_ROLES.find((r) => r.key === legacyKey) || null;
  }
  return (
    BOARD_ROLES.find((r) => r.label.toLowerCase() === normalized) ||
    BOARD_ROLES.find((r) => normalized.includes(r.key)) ||
    null
  );
}

export function getRoleIcon(roleKey) {
  return ROLE_ICONS[roleKey] || ROLE_ICONS.default;
}

const ROLE_ICONS = {
  president: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" strokeLinejoin="round" />
    </svg>
  ),
  rh_formations: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="8" cy="8" r="2.5" />
      <circle cx="16" cy="9" r="2" />
      <path d="M3 18c0-2.5 2.2-4.5 5-4.5M13 18c0-2 1.8-3.5 4-3.5" strokeLinecap="round" />
      <path d="M12 11v2M10 13h4" strokeLinecap="round" />
      <path d="M11 6l1-2 1 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  secretaire: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h6M9 11h6M9 15h4" strokeLinecap="round" />
    </svg>
  ),
  tresoriere: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18M8 14h.01M12 14h4" strokeLinecap="round" />
    </svg>
  ),
  prospection: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9z" strokeLinejoin="round" />
    </svg>
  ),
  logistique: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3 7h11v10H3V7zM14 10h4l3 3v4h-7v-7z" strokeLinejoin="round" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  ),
  projet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" strokeLinecap="round" />
      <circle cx="12" cy="12" r="4" />
      <path d="M7 7l2 2M15 15l2 2M17 7l-2 2M9 15l-2 2" strokeLinecap="round" />
    </svg>
  ),
  evenement: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M4 11h16" strokeLinecap="round" />
      <path d="M8 15h4" strokeLinecap="round" />
    </svg>
  ),
  media: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M10 9l5 3-5 3V9z" strokeLinejoin="round" />
    </svg>
  ),
  qualite: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  default: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c0-4 3.5-6 7-6s7 2 7 6" strokeLinecap="round" />
    </svg>
  ),
};
