/** Barème officiel du système mérite ENISO Team */
const MERIT_ACTIONS = [
  {
    code: 'presence_reunion',
    label: 'Présence aux réunions ordinaires',
    points: 2,
    auto: 'attendance_reunion',
  },
  {
    code: 'presence_ag',
    label: "Présence à l'Assemblée Générale",
    points: 6,
    auto: 'attendance_assemblee_generale',
  },
  {
    code: 'projet_continu',
    label: 'Participation et le travail continu dans un projet',
    points: 5,
    auto: null,
  },
  {
    code: 'projet_proposition',
    label:
      "Proposition d'un projet, avec l'approbation du bureau et le travail continu sur ce projet",
    points: 8,
    auto: null,
  },
  {
    code: 'projet_suggestion',
    label: "Suggestion d'une idée d'un projet réalisable",
    points: 1,
    auto: null,
  },
  {
    code: 'competition_prix',
    label: "Participation à une compétition robotique et l'obtention d'un prix",
    points: 10,
    auto: null,
  },
  {
    code: 'competition',
    label: 'Participation à une compétition robotique',
    points: 3,
    auto: 'deplacement_liste',
  },
  {
    code: 'competition_projet',
    label: 'Participation à une compétition robotique et le travail continu sur le projet',
    points: 5,
    auto: null,
  },
  {
    code: 'sponsoring',
    label: 'Participation aux sorties de sponsoring',
    points: 3,
    auto: null,
  },
  {
    code: 'comite_organisation',
    label: "Participation au sein d'un comité d'organisation",
    points: 3,
    auto: null,
  },
  {
    code: 'passage_radio',
    label: 'Décrocher un passage radio',
    points: 3,
    auto: null,
  },
  {
    code: 'organisation_evenement',
    label: "Participation à l'organisation des événements du Club",
    points: 4,
    auto: null,
  },
  {
    code: 'evenement_proposition',
    label: "Proposition d'un événement et le travail continu pour le faire réussir",
    points: 8,
    auto: null,
  },
  {
    code: 'formation',
    label: 'Participation à une formation',
    points: 1,
    auto: 'attendance_formation',
  },
  {
    code: 'visite_industrielle',
    label: 'Participation à une visite industrielle',
    points: 1,
    auto: null,
  },
  {
    code: 'absenteisme_3_reunions',
    label: 'Absentéisme pour trois réunions successives',
    points: -6,
    auto: 'absenteeism',
  },
  {
    code: 'bonus_motivation',
    label: 'Points supplémentaires (motivation / bénévolat)',
    points: null,
    auto: null,
    customPoints: true,
  },
];

function getAction(code) {
  return MERIT_ACTIONS.find((a) => a.code === code) || null;
}

function actionForAttendanceType(sessionType) {
  if (sessionType === 'reunion') return getAction('presence_reunion');
  if (sessionType === 'assemblee_generale') return getAction('presence_ag');
  if (sessionType === 'formation') return getAction('formation');
  return null;
}

module.exports = {
  MERIT_ACTIONS,
  getAction,
  actionForAttendanceType,
};
