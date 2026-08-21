const {
  DEFAULT_MAIL_PAIEMENT_SUJET,
  DEFAULT_MAIL_PAIEMENT_CORPS,
} = require('../models/financeSettingsModel');

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
  if (dateStr instanceof Date && !Number.isNaN(dateStr.getTime())) {
    return dateStr.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }
  const raw = String(dateStr);
  const match = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    }
  }
  const fallback = new Date(raw);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }
  return raw.slice(0, 10);
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

  const subjectTemplate =
    String(settings.mail_paiement_sujet || '').trim() || DEFAULT_MAIL_PAIEMENT_SUJET;
  const bodyTemplate =
    String(settings.mail_paiement_corps || '').trim() || DEFAULT_MAIL_PAIEMENT_CORPS;

  const subject = applyMailPlaceholders(subjectTemplate, vars);
  const text = applyMailPlaceholders(bodyTemplate, vars);
  return { subject, text, html: textToHtml(text) };
}

module.exports = {
  buildCotisationPaymentEmail,
  DEFAULT_MAIL_PAIEMENT_SUJET,
  DEFAULT_MAIL_PAIEMENT_CORPS,
};
