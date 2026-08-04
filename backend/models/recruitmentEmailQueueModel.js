const pool = require('../config/db');
const { sendMail } = require('../services/emailService');

async function enqueue({ candidate_id, email_to, type, subject, body, scheduled_at }) {
  const [result] = await pool.execute(
    `INSERT INTO recruitment_email_queue
      (candidate_id, email_to, type, subject, body, scheduled_at, statut)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [candidate_id || null, email_to, type, subject, body, scheduled_at]
  );
  return result.insertId;
}

/** Enregistre et envoie tout de suite (sans attendre le cron). */
async function sendImmediate({ candidate_id, email_to, type, subject, body, html }) {
  const scheduled_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const id = await enqueue({
    candidate_id,
    email_to,
    type,
    subject,
    body,
    scheduled_at,
  });

  try {
    await sendMail({ to: email_to, subject, text: body, html });
    await pool.execute(
      `UPDATE recruitment_email_queue SET statut = 'sent', sent_at = NOW(), error = NULL WHERE id = ?`,
      [id]
    );
    return { id, sent: true };
  } catch (err) {
    await pool.execute(
      `UPDATE recruitment_email_queue SET statut = 'failed', error = ? WHERE id = ?`,
      [String(err.message || err).slice(0, 1000), id]
    );
    throw err;
  }
}

async function processDue(limit = 20) {
  const [rows] = await pool.execute(
    `SELECT * FROM recruitment_email_queue
     WHERE statut = 'pending' AND scheduled_at <= NOW()
     ORDER BY scheduled_at ASC
     LIMIT ${Number(limit)}`
  );

  for (const row of rows) {
    try {
      await sendMail({ to: row.email_to, subject: row.subject, text: row.body });
      await pool.execute(
        `UPDATE recruitment_email_queue SET statut = 'sent', sent_at = NOW(), error = NULL WHERE id = ?`,
        [row.id]
      );
    } catch (err) {
      await pool.execute(
        `UPDATE recruitment_email_queue SET statut = 'failed', error = ? WHERE id = ?`,
        [String(err.message || err).slice(0, 1000), row.id]
      );
    }
  }

  return rows.length;
}

async function list({ page = 1, limit = 20 } = {}) {
  const offset = (Math.max(1, page) - 1) * limit;
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM recruitment_email_queue`
  );
  const [rows] = await pool.execute(
    `SELECT * FROM recruitment_email_queue
     ORDER BY created_at DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`
  );
  return {
    items: rows,
    total: Number(countRows[0].total),
    page: Number(page),
    limit: Number(limit),
  };
}

module.exports = { enqueue, sendImmediate, processDue, list };
