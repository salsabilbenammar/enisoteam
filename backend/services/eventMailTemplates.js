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
  const withLinks = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#1a73e8;word-break:break-all">$1</a>'
  );
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#222">${withLinks.replace(/\n/g, '<br>')}</div>`;
}

const DEFAULT_SUBJECT = 'Sélection — [Evenement]';
const DEFAULT_BODY = `Bonjour [Nom],

Nous avons le plaisir de vous informer que votre inscription à « [Evenement] » a été retenue.

Date : [Date]
Lieu : [Lieu]
Type d'inscription : [Type]

Cordialement,
ENISO Team`;

function buildMailVars(registration, event) {
  const nom = `${registration.prenom || ''} ${registration.nom || ''}`.trim();
  const answers =
    registration.reponses_personnalisees &&
    typeof registration.reponses_personnalisees === 'object'
      ? registration.reponses_personnalisees
      : {};
  const isGroup = answers.mode_inscription === 'groupe';
  const groupMembers = (registration.accompagnants || [])
    .map((c) => `${c.prenom || ''} ${c.nom || ''}`.trim())
    .filter(Boolean)
    .join(', ');
  return {
    Nom: nom,
    Evenement: event.titre || 'Événement',
    Date: event.date ? new Date(event.date).toLocaleString('fr-FR') : '—',
    Lieu: event.lieu || '—',
    Type: isGroup ? 'Groupe' : 'Personne',
    Groupe: groupMembers || '—',
    Email: registration.email || '',
  };
}

function buildSelectionEmail(registration, event, settings = {}) {
  const vars = buildMailVars(registration, event);
  const subject = applyMailPlaceholders(settings.subject || DEFAULT_SUBJECT, vars);
  const text = applyMailPlaceholders(settings.body || settings.corps || DEFAULT_BODY, vars);
  return {
    subject,
    text,
    html: textToHtml(text),
  };
}

module.exports = {
  applyMailPlaceholders,
  textToHtml,
  buildSelectionEmail,
  DEFAULT_SUBJECT,
  DEFAULT_BODY,
};
