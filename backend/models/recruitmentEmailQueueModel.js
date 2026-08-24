const pool = require('../config/db');
const { sendMail } = require('../services/emailService');

async function enqueue({ candidate_id, email_to, type, subject, body, scheduled_at }) {
  // Évite d’empiler un 2e mail du même type encore en attente
  if (candidate_id && type) {
    await cancelPending(candidate_id, type);
  }

  const [result] = await pool.execute(
    `INSERT INTO recruitment_email_queue
      (candidate_id, email_to, type, subject, body, scheduled_at, statut)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [candidate_id || null, email_to, type, subject, body, scheduled_at]
  );
  return result.insertId;
}

/** Annule les envois en attente (même candidat + même type). */
async function cancelPending(candidate_id, type) {
  if (!candidate_id || !type) return 0;
  const [result] = await pool.execute(
    `UPDATE recruitment_email_queue
     SET statut = 'cancelled', error = 'Remplacé par un nouvel envoi'
     WHERE candidate_id = ? AND type = ? AND statut = 'pending'`,
    [candidate_id, type]
  );
  return result.affectedRows;
}

async function countSent(candidate_id, type) {
  if (!candidate_id || !type) return 0;
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS n FROM recruitment_email_queue
     WHERE candidate_id = ? AND type = ? AND statut = 'sent'`,
    [candidate_id, type]
  );
  return Number(rows[0]?.n || 0);
}

/**
 * Envoie tout de suite — sans passer par statut pending
 * (évite le double envoi avec le cron qui traite la file).
 * @param {{ skipIfAlreadySent?: boolean }} [options]
 */
async function sendImmediate(
  { candidate_id, email_to, type, subject, body, html },
  options = {}
) {
  const { skipIfAlreadySent = false } = options;

  if (skipIfAlreadySent && candidate_id && type) {
    const already = await countSent(candidate_id, type);
    if (already > 0) {
      await cancelPending(candidate_id, type);
      return { skipped: true, sent: false };
    }
  }

  await cancelPending(candidate_id, type);

  const scheduled_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    const info = await sendMail({ to: email_to, subject, text: body, html });
    const [result] = await pool.execute(
      `INSERT INTO recruitment_email_queue
        (candidate_id, email_to, type, subject, body, scheduled_at, statut, sent_at, error)
       VALUES (?, ?, ?, ?, ?, ?, 'sent', NOW(), NULL)`,
      [candidate_id || null, email_to, type, subject, body, scheduled_at]
    );
    return { id: result.insertId, sent: true, simulated: Boolean(info && info.simulated) };
  } catch (err) {
    const [result] = await pool.execute(
      `INSERT INTO recruitment_email_queue
        (candidate_id, email_to, type, subject, body, scheduled_at, statut, error)
       VALUES (?, ?, ?, ?, ?, ?, 'failed', ?)`,
      [
        candidate_id || null,
        email_to,
        type,
        subject,
        body,
        scheduled_at,
        String(err.message || err).slice(0, 1000),
      ]
    );
    const e = err;
    e.queueId = result.insertId;
    throw e;
  }
}

/** Claim atomique d’une ligne pending → évite 2 workers / cron qui envoient 2 fois. */
async function claimPending(id) {
  const [result] = await pool.execute(
    `UPDATE recruitment_email_queue
     SET error = '__sending__'
     WHERE id = ? AND statut = 'pending' AND (error IS NULL OR error <> '__sending__')`,
    [id]
  );
  return result.affectedRows > 0;
}

async function processDue(limit = 20) {
  const [rows] = await pool.execute(
    `SELECT * FROM recruitment_email_queue
     WHERE statut = 'pending' AND scheduled_at <= NOW()
       AND (error IS NULL OR error <> '__sending__')
     ORDER BY scheduled_at ASC
     LIMIT ${Number(limit)}`
  );

  let sent = 0;
  for (const row of rows) {
    const claimed = await claimPending(row.id);
    if (!claimed) continue;

    // Si un mail du même type a déjà été envoyé, annule ce pending
    if (row.candidate_id && row.type) {
      const already = await countSent(row.candidate_id, row.type);
      if (already > 0) {
        await pool.execute(
          `UPDATE recruitment_email_queue
           SET statut = 'cancelled', error = 'Doublon évité (déjà envoyé)'
           WHERE id = ?`,
          [row.id]
        );
        continue;
      }
    }

    try {
      await sendMail({ to: row.email_to, subject: row.subject, text: row.body });
      await pool.execute(
        `UPDATE recruitment_email_queue
         SET statut = 'sent', sent_at = NOW(), error = NULL
         WHERE id = ?`,
        [row.id]
      );
      sent += 1;
    } catch (err) {
      await pool.execute(
        `UPDATE recruitment_email_queue SET statut = 'failed', error = ? WHERE id = ?`,
        [String(err.message || err).slice(0, 1000), row.id]
      );
    }
  }

  return sent;
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

module.exports = {
  enqueue,
  sendImmediate,
  processDue,
  list,
  cancelPending,
  countSent,
};
