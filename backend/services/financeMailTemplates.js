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

function formatMoney(amount, devise = 'DT') {
  const v = Number(amount) || 0;
  return `${v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${devise}`;
}

function formatDateFr(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(String(dateStr).slice(0, 10));
  if (Number.isNaN(d.getTime())) return String(dateStr).slice(0, 10);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function buildCotisationPaymentEmail({
  member,
  payment,
  typeLabel,
  settings = {},
  detailLabel = '',
  methodLabel = '',
}) {
  const devise = settings.devise || 'DT';
  const nom = member?.nom || 'Membre';
  const detailLine = detailLabel ? `\nDétail : ${detailLabel}` : '';
  const noteLine = payment?.note ? `\nNote : ${payment.note}` : '';

  const vars = {
    Nom: nom,
    Type: typeLabel || payment?.cotisation_type || 'Cotisation',
    Annee: String(payment?.annee_cotisation || settings.cotisation_annee || ''),
    Montant: formatMoney(payment?.montant, devise),
    Devise: devise,
    DatePaiement: formatDateFr(payment?.date_paiement),
    Methode: methodLabel || payment?.methode || '—',
    Detail: detailLabel || '—',
    Note: payment?.note || '—',
  };

  const subject = applyMailPlaceholders(
    'Confirmation de paiement — [Type] [Annee]',
    vars
  );

  const bodyTemplate = `Bonjour [Nom],

Nous confirmons la réception de votre paiement enregistré par le trésorier ENISO Team.

Type de cotisation : [Type]
Année : [Annee]
Montant : [Montant]
Date du paiement : [DatePaiement]
Méthode : [Methode]${detailLine}${noteLine}

Conservez cet email comme justificatif. Pour toute question, contactez le trésorier du club.

— ENISO Team`;

  const text = applyMailPlaceholders(bodyTemplate, vars);
  return { subject, text, html: textToHtml(text) };
}

module.exports = {
  buildCotisationPaymentEmail,
};
