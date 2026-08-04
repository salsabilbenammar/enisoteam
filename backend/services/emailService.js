const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  if (!host) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: String(process.env.SMTP_PASS || '').replace(/\s+/g, ''),
        }
      : undefined,
  });

  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const transport = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@enisoteam.local';

  if (!transport) {
    console.warn('[email] SMTP non configuré — email simulé:', { to, subject });
    return { simulated: true, messageId: `sim-${Date.now()}` };
  }

  const info = await transport.sendMail({
    from,
    to,
    subject,
    text,
    html: html || textToSimpleHtml(text),
  });
  return info;
}

function textToSimpleHtml(text) {
  const escaped = String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const withLinks = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#1a73e8;word-break:break-all">$1</a>'
  );
  return `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap;font-size:15px">${withLinks}</pre>`;
}

module.exports = { sendMail, getTransporter };
