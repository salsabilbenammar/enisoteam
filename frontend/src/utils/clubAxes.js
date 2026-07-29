/** Axes du club — stockés en JSON dans club_info.contenu */

export const DEFAULT_AXES = [
  {
    titre: 'Formation',
    description:
      "Nous accompagnons chaque nouveau membre dès son intégration et l'aidons à développer ses compétences tout au long de son parcours au sein du club. À travers des formations de court et long terme dans différents thèmes techniques, nous cherchons continuellement des formateurs internes ou externes capables de transmettre leur savoir-faire à nos adhérents.",
  },
  {
    titre: 'Projet',
    description:
      "Nos équipes travaillent sur des projets concrets, de l'étude de faisabilité jusqu'à la réalisation. Chaque projet est encadré et coordonné pour garantir son bon avancement dans les délais fixés, avec les ressources humaines et matérielles nécessaires à sa réussite.",
  },
  {
    titre: 'Prospection',
    description:
      'Nous développons et entretenons des relations solides avec nos partenaires externes et les entreprises. Cet axe vise à faire rayonner le club au-delà de ses murs, à décrocher des opportunités de collaboration et à donner à nos projets les moyens de se concrétiser.',
  },
  {
    titre: 'Événementiel',
    description:
      "Nous organisons et supervisons l'ensemble des événements du club, en particulier notre événement phare, l'ESC. De la coordination des sous-comités à la gestion administrative, cet axe rassemble nos membres autour de moments forts qui font vivre l'ENISo Team.",
  },
];

export function isAxesSection(titre) {
  if (!titre) return false;
  const t = titre.trim().toLowerCase();
  return t === 'nos axes' || t === 'nos valeurs';
}

export function parseAxes(contenu) {
  if (!contenu || !String(contenu).trim()) return [...DEFAULT_AXES];
  try {
    const parsed = JSON.parse(contenu);
    if (Array.isArray(parsed) && parsed.length) {
      return parsed
        .filter((a) => a && (a.titre || a.description))
        .map((a) => ({
          titre: String(a.titre || '').trim(),
          description: String(a.description || '').trim(),
        }));
    }
  } catch {
    // format legacy texte
  }
  return [...DEFAULT_AXES];
}

export function serializeAxes(axes) {
  return JSON.stringify(
    axes.map((a) => ({
      titre: a.titre.trim(),
      description: a.description.trim(),
    }))
  );
}
