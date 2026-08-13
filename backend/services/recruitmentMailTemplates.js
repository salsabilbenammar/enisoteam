const crypto = require('crypto');

const STATUSES = [
  'en_attente',
  'preselectionne',
  'entretien_confirme',
  'present_entretien',
  'accepte',
  'refuse',
  'liste_attente',
  'paiement_en_attente',
  'paiement_confirme',
];

const STATUS_LABELS = {
  en_attente: 'En attente',
  preselectionne: 'Présélectionné',
  entretien_confirme: 'Entretien confirmé',
  present_entretien: 'Présent à l\'entretien',
  accepte: 'Accepté',
  refuse: 'Refusé',
  liste_attente: 'Liste d\'attente',
  paiement_en_attente: 'Paiement en attente',
  paiement_confirme: 'Paiement confirmé',
};

function createToken() {
  return crypto.randomBytes(32).toString('hex');
}

function applyMailPlaceholders(template, vars = {}) {
  let out = String(template || '');
  for (const [key, value] of Object.entries(vars)) {
    const re = new RegExp(`\\[${key}\\]`, 'gi');
    out = out.replace(re, value == null ? '' : String(value));
  }
  return out;
}

function textToHtml(text) {
  const escaped = String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Transforme les URLs en liens cliquables (évite la coupure du token)
  const withLinks = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#1a73e8;word-break:break-all">$1</a>'
  );
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#222">${withLinks.replace(/\n/g, '<br>')}</div>`;
}

function buildConfirmationEmail(candidate, link, settings = {}) {
  const nom = `${candidate.prenom} ${candidate.nom}`.trim();
  const subject =
    settings.mail_confirmation_sujet || 'Confirmation de candidature';
  const bodyTemplate =
    settings.mail_confirmation_corps ||
    `Bonjour [Nom],

Nous avons bien reçu votre candidature.

Merci de choisir dès maintenant l'un des créneaux d'entretien disponibles via ce lien sécurisé :

[Lien]

— ENISO Team`;
  const text = applyMailPlaceholders(bodyTemplate, { Nom: nom, Lien: link });
  return {
    subject: applyMailPlaceholders(subject, { Nom: nom, Lien: link }),
    text,
    html: textToHtml(text),
  };
}

function buildInvitationEmail(candidate, link) {
  const nom = `${candidate.prenom} ${candidate.nom}`.trim();
  const subject = 'Invitation à réserver votre entretien — ENISO Team';
  const text = `Bonjour ${nom},

Votre candidature a été présélectionnée.

Veuillez réserver votre créneau d'entretien via ce lien sécurisé (usage unique) :
${link}

Merci de choisir rapidement l'un des créneaux disponibles.

— ENISO Team`;
  return { subject, text };
}

function buildInterviewConfirmationEmail(candidate, slot, settings) {
  const nom = `${candidate.prenom} ${candidate.nom}`.trim();
  const date = formatDateFr(slot.date_slot);
  const heure = String(slot.heure_slot).slice(0, 5);
  const lieu = slot.lieu || settings?.lieu_defaut || 'ENISO';
  const infos = settings?.infos_entretien || '';
  const isMedia = String(candidate?.stream || '') === 'media_babies';
  const brand = isMedia ? 'ENISO Team · Media Babies' : 'ENISO Team';
  const subject = isMedia
    ? 'Confirmation de votre entretien Media Babies'
    : 'Confirmation de votre entretien';
  const text = `Bonjour ${nom},

Votre entretien est confirmé.

Date : ${date}
Heure : ${heure}
Lieu : ${lieu}

${infos}

— ${brand}`;
  return { subject, text };
}

function buildPaymentRequestEmail(candidate, settings) {
  return buildSuccessPaymentEmail(candidate, settings);
}

function buildSuccessPaymentEmail(candidate, settings = {}) {
  const nom = `${candidate.prenom} ${candidate.nom}`.trim();
  const vars = {
    Nom: nom,
    Montant: settings.montant_paiement || '—',
    Delai: settings.delai_paiement || '—',
    Tresorier: settings.tresorier_nom || '—',
    Contact: settings.tresorier_contact || '—',
    Infos: settings.infos_paiement || '',
  };
  const subject =
    settings.mail_reussite_sujet || 'Félicitations — entretien réussi';
  const bodyTemplate =
    settings.mail_reussite_corps ||
    `Bonjour [Nom],

Félicitations ! Vous avez réussi votre entretien d'intégration à l'ENISO Team.

Pour finaliser votre adhésion, merci de régler les frais auprès du trésorier dans le délai indiqué :

Montant : [Montant]
Délai : [Delai]
Trésorier : [Tresorier]
Contact : [Contact]

[Infos]

Merci.

— ENISO Team`;
  const text = applyMailPlaceholders(bodyTemplate, vars);
  return {
    subject: applyMailPlaceholders(subject, vars),
    text,
    html: textToHtml(text),
  };
}

function buildPaymentConfirmedEmail(candidate, settings = {}, credentials = {}) {
  const nom = `${candidate.prenom} ${candidate.nom}`.trim();
  const frontend = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  // Toujours la page de connexion membre (jamais /admin)
  const loginUrl = `${frontend}/login`;
  const email = credentials.email || candidate.email || '';
  const password = credentials.temporaryPassword || '';
  const vars = {
    Nom: nom,
    Email: email,
    Password: password || '—',
    LienConnexion: loginUrl,
    Messenger: settings.lien_messenger || '—',
    Facebook: settings.lien_facebook || '—',
  };
  const defaultSubject = 'Paiement confirmé — vos identifiants membre ENISO Team';
  const defaultBody = `Bonjour [Nom],

Nous confirmons la réception de votre paiement. Bienvenue dans l'ENISO Team !

Votre compte membre a été créé. Voici vos identifiants de connexion :

Email : [Email]
Mot de passe (généré automatiquement) : [Password]
Lien de connexion : [LienConnexion]

Pour votre sécurité, changez ce mot de passe dès votre première connexion (menu Profil).

Rejoignez aussi nos espaces communautaires :
Messenger : [Messenger]
Facebook : [Facebook]

À très bientôt,

— ENISO Team`;

  let bodyTemplate = settings.mail_paiement_corps || defaultBody;
  if (!String(bodyTemplate).includes('[Password]') || !String(bodyTemplate).includes('[Email]')) {
    bodyTemplate = defaultBody;
  }

  const subject = settings.mail_paiement_sujet || defaultSubject;
  let text = applyMailPlaceholders(bodyTemplate, vars);

  // Garantit la présence des identifiants même si le modèle admin est incomplet
  if (password && !text.includes(password)) {
    text += `

--- Accès membre ---
Email : ${email}
Mot de passe (généré automatiquement) : ${password}
Lien de connexion : ${loginUrl}
`;
  }

  return {
    subject: applyMailPlaceholders(subject, vars),
    text,
    html: textToHtml(text),
  };
}

function buildMediaSuccessEmail(candidate, settings = {}) {
  const nom = `${candidate.prenom} ${candidate.nom}`.trim();
  const vars = { Nom: nom };
  const subject =
    settings.mail_media_reussite_sujet || 'Félicitations — entretien Media Babies réussi';
  const bodyTemplate =
    settings.mail_media_reussite_corps ||
    `Bonjour [Nom],

Félicitations ! Vous avez réussi votre entretien Media Babies.

Bienvenue dans l'aventure Media Babies avec l'ENISO Team.

À très bientôt,

— ENISO Team · Media Babies`;
  const text = applyMailPlaceholders(bodyTemplate, vars);
  return {
    subject: applyMailPlaceholders(subject, vars),
    text,
    html: textToHtml(text),
  };
}

function formatDateFr(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('fr-FR');
}

module.exports = {
  STATUSES,
  STATUS_LABELS,
  createToken,
  buildConfirmationEmail,
  buildInvitationEmail,
  buildInterviewConfirmationEmail,
  buildPaymentRequestEmail,
  buildSuccessPaymentEmail,
  buildMediaSuccessEmail,
  buildPaymentConfirmedEmail,
  formatDateFr,
};
