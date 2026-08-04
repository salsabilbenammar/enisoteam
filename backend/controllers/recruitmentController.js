const candidateModel = require('../models/recruitmentCandidateModel');
const slotModel = require('../models/recruitmentSlotModel');
const emailQueueModel = require('../models/recruitmentEmailQueueModel');
const settingsModel = require('../models/recruitmentSettingsModel');
const {
  STATUS_LABELS,
  createToken,
  buildConfirmationEmail,
  buildInvitationEmail,
  buildInterviewConfirmationEmail,
  buildPaymentRequestEmail,
  buildSuccessPaymentEmail,
  buildPaymentConfirmedEmail,
} = require('../services/recruitmentMailTemplates');
const googleSheets = require('../services/googleSheetsService');

function parseIds(body) {
  const raw = body.ids || body.candidate_ids || [];
  return [...new Set((Array.isArray(raw) ? raw : [raw]).map(Number).filter(Boolean))];
}

function parseScheduleDate(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const t = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  return `${dateStr} ${t}`;
}

function frontendBase() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

async function getPublicStatus(_req, res, next) {
  try {
    const open = await settingsModel.isOpen();
    res.json({ candidature_ouverte: open });
  } catch (err) {
    next(err);
  }
}

/* ─── Public ─── */

async function apply(req, res, next) {
  try {
    const open = await settingsModel.isOpen();
    if (!open) {
      return res.status(403).json({
        message: 'Les candidatures sont actuellement fermées.',
      });
    }
    const {
      nom,
      prenom,
      email,
      telephone,
      facebook_link,
      filiere,
      annee,
      adresse,
      motivation,
      motivation_robotics,
      domaine_interet,
      unique_about,
    } = req.body;

    if (
      !nom ||
      !prenom ||
      !email ||
      !telephone ||
      !facebook_link ||
      !filiere ||
      !adresse ||
      !motivation ||
      !motivation_robotics ||
      !domaine_interet ||
      !unique_about
    ) {
      return res.status(400).json({
        message: 'Veuillez remplir tous les champs obligatoires.',
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return res.status(400).json({ message: 'Email invalide.' });
    }

    const photo = req.files?.photo?.[0];
    if (!photo) {
      return res.status(400).json({ message: 'La photo pour la carte membre est requise.' });
    }
    const attachment = req.files?.piece_jointe?.[0];

    let candidate = await candidateModel.create({
      nom: String(nom).trim(),
      prenom: String(prenom).trim(),
      email: String(email).trim().toLowerCase(),
      telephone: String(telephone).trim(),
      facebook_link: String(facebook_link).trim(),
      filiere: String(filiere).trim(),
      annee: annee ? String(annee).trim() : null,
      adresse: String(adresse).trim(),
      photo_path: `/uploads/recruitment/${photo.filename}`,
      motivation: String(motivation).trim(),
      motivation_robotics: String(motivation_robotics).trim(),
      domaine_interet: String(domaine_interet).trim(),
      unique_about: String(unique_about).trim(),
      piece_jointe_path: attachment ? `/uploads/recruitment/${attachment.filename}` : null,
    });

    // Token + lien calendrier envoyés dès le premier mail
    candidate = await candidateModel.setBookingToken(candidate.id, createToken());
    const settings = await settingsModel.get();
    const link = `${frontendBase()}/recrutement/reservation/${candidate.booking_token}`;
    const mail = buildConfirmationEmail(candidate, link, settings);
    await emailQueueModel.enqueue({
      candidate_id: candidate.id,
      email_to: candidate.email,
      type: 'confirmation',
      subject: mail.subject,
      body: mail.text,
      scheduled_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });

    res.status(201).json({
      message: 'Candidature envoyée avec succès.',
      id: candidate.id,
    });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({
        message:
          'Tables recrutement absentes. Exécutez database/update_recruitment_module.sql',
      });
    }
    next(err);
  }
}

async function getBookingPage(req, res, next) {
  try {
    const candidate = await candidateModel.findByToken(req.params.token);
    if (!candidate) return res.status(404).json({ message: 'Lien invalide ou expiré.' });

    if (candidate.interview_slot_id) {
      return res.json({
        candidate: {
          id: candidate.id,
          nom: candidate.nom,
          prenom: candidate.prenom,
          statut: candidate.statut,
          booked: true,
          date_slot: candidate.date_slot,
          heure_slot: candidate.heure_slot,
          lieu: candidate.slot_lieu,
        },
        slots: [],
      });
    }

    if (!['en_attente', 'preselectionne'].includes(candidate.statut)) {
      return res.status(403).json({
        message: 'Ce lien ne permet plus de réserver un créneau.',
      });
    }

    const slots = await slotModel.getAvailable();
    res.json({
      candidate: {
        id: candidate.id,
        nom: candidate.nom,
        prenom: candidate.prenom,
        statut: candidate.statut,
        booked: false,
      },
      slots,
    });
  } catch (err) {
    next(err);
  }
}

async function bookSlot(req, res, next) {
  try {
    const candidate = await candidateModel.findByToken(req.params.token);
    if (!candidate) return res.status(404).json({ message: 'Lien invalide ou expiré.' });

    const slotId = Number(req.body.slot_id);
    if (!slotId) return res.status(400).json({ message: 'Créneau requis.' });

    const updated = await candidateModel.bookSlot(candidate.id, slotId);
    const slot = await slotModel.getById(slotId);
    const settings = await settingsModel.get();
    const mail = buildInterviewConfirmationEmail(updated, slot, settings);

    await emailQueueModel.enqueue({
      candidate_id: updated.id,
      email_to: updated.email,
      type: 'interview_confirmation',
      subject: mail.subject,
      body: mail.text,
      scheduled_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });

    res.json({
      message: 'Créneau réservé avec succès.',
      candidate: updated,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

/* ─── Admin candidates ─── */

async function listCandidates(req, res, next) {
  try {
    const data = await candidateModel.list({
      search: req.query.search || '',
      statut: req.query.statut || '',
      date_slot: req.query.date_slot || '',
      heure_slot: req.query.heure_slot || '',
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 10),
    });
    res.json({ ...data, statusLabels: STATUS_LABELS });
  } catch (err) {
    next(err);
  }
}

async function getStats(_req, res, next) {
  try {
    res.json(await candidateModel.getStats());
  } catch (err) {
    next(err);
  }
}

async function getCandidate(req, res, next) {
  try {
    const row = await candidateModel.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Candidat introuvable.' });
    const history = await candidateModel.getHistory(row.id);
    res.json({ ...row, history, statusLabels: STATUS_LABELS });
  } catch (err) {
    next(err);
  }
}

async function bulkStatus(req, res, next) {
  try {
    const ids = parseIds(req.body);
    const { statut, note } = req.body;
    if (!ids.length) return res.status(400).json({ message: 'Aucun candidat sélectionné.' });
    const rows = await candidateModel.updateStatus(ids, statut, note || null);
    res.json({ message: 'Statut mis à jour.', items: rows });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

async function removeCandidate(req, res, next) {
  try {
    const ok = await candidateModel.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Candidat introuvable.' });
    res.json({ message: 'Candidat supprimé.' });
  } catch (err) {
    next(err);
  }
}

async function resendConfirmation(req, res, next) {
  try {
    let candidate = await candidateModel.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidat introuvable.' });

    if (!candidate.booking_token) {
      candidate = await candidateModel.setBookingToken(candidate.id, createToken());
    }

    const settings = await settingsModel.get();
    const link = `${frontendBase()}/recrutement/reservation/${candidate.booking_token}`;
    const mail = buildConfirmationEmail(candidate, link, settings);

    await emailQueueModel.sendImmediate({
      candidate_id: candidate.id,
      email_to: candidate.email,
      type: 'confirmation',
      subject: mail.subject,
      body: mail.text,
      html: mail.html,
    });

    res.json({ message: `Email de confirmation envoyé à ${candidate.email}.` });
  } catch (err) {
    next(err);
  }
}

async function markPresent(req, res, next) {
  try {
    const candidate = await candidateModel.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidat introuvable.' });
    if (candidate.statut !== 'entretien_confirme') {
      return res.status(400).json({
        message: 'Seuls les candidats à l\'entretien confirmé peuvent être marqués présents.',
      });
    }

    const [updated] = await candidateModel.updateStatus(
      [candidate.id],
      'present_entretien',
      'Présent à l\'entretien'
    );
    res.json({
      message: `${candidate.prenom} ${candidate.nom} marqué(e) présent(e).`,
      candidate: updated,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

async function sendSuccessPayment(req, res, next) {
  try {
    const candidate = await candidateModel.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidat introuvable.' });
    if (candidate.statut !== 'present_entretien') {
      return res.status(400).json({
        message: 'Seuls les candidats présents à l\'entretien peuvent recevoir ce mail.',
      });
    }

    const settings = await settingsModel.get();
    const mail = buildSuccessPaymentEmail(candidate, settings);

    await candidateModel.updateStatus(
      [candidate.id],
      'paiement_en_attente',
      'Entretien réussi — demande de paiement'
    );

    await emailQueueModel.sendImmediate({
      candidate_id: candidate.id,
      email_to: candidate.email,
      type: 'success_payment',
      subject: mail.subject,
      body: mail.text,
      html: mail.html,
    });

    const updated = await candidateModel.findById(candidate.id);
    res.json({
      message: `Mail de réussite + paiement envoyé à ${candidate.email}.`,
      candidate: updated,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

/* ─── Invitations / payments ─── */

async function scheduleInvitations(req, res, next) {
  try {
    const ids = parseIds(req.body);
    const scheduled_at = parseScheduleDate(req.body.date, req.body.heure);
    if (!ids.length) return res.status(400).json({ message: 'Aucun candidat sélectionné.' });
    if (!scheduled_at) {
      return res.status(400).json({ message: 'Date et heure d\'envoi requises.' });
    }

    await candidateModel.updateStatus(ids, 'preselectionne', 'Présélection pour entretien');

    let count = 0;
    for (const id of ids) {
      let candidate = await candidateModel.findById(id);
      if (!candidate) continue;
      if (!candidate.booking_token) {
        candidate = await candidateModel.setBookingToken(id, createToken());
      }
      const link = `${frontendBase()}/recrutement/reservation/${candidate.booking_token}`;
      const mail = buildInvitationEmail(candidate, link);
      await emailQueueModel.enqueue({
        candidate_id: candidate.id,
        email_to: candidate.email,
        type: 'invitation',
        subject: mail.subject,
        body: mail.text,
        scheduled_at,
      });
      count += 1;
    }

    res.json({ message: `${count} invitation(s) programmée(s).`, count });
  } catch (err) {
    next(err);
  }
}

async function schedulePaymentRequests(req, res, next) {
  try {
    const ids = parseIds(req.body);
    const scheduled_at = parseScheduleDate(req.body.date, req.body.heure);
    if (!ids.length) return res.status(400).json({ message: 'Aucun candidat sélectionné.' });
    if (!scheduled_at) {
      return res.status(400).json({ message: 'Date et heure d\'envoi requises.' });
    }

    const settings = await settingsModel.get();
    const accepted = [];
    for (const id of ids) {
      const c = await candidateModel.findById(id);
      if (c && c.statut === 'accepte') accepted.push(c.id);
    }
    if (!accepted.length) {
      return res.status(400).json({
        message: 'Sélectionnez des candidats au statut « Accepté ».',
      });
    }

    await candidateModel.updateStatus(accepted, 'paiement_en_attente', 'Demande de paiement');

    let count = 0;
    for (const id of accepted) {
      const candidate = await candidateModel.findById(id);
      const mail = buildPaymentRequestEmail(candidate, settings);
      await emailQueueModel.enqueue({
        candidate_id: candidate.id,
        email_to: candidate.email,
        type: 'payment_request',
        subject: mail.subject,
        body: mail.text,
        scheduled_at,
      });
      count += 1;
    }

    res.json({ message: `${count} demande(s) de paiement programmée(s).`, count });
  } catch (err) {
    next(err);
  }
}

async function confirmPayments(req, res, next) {
  try {
    const ids = parseIds(req.body);
    if (!ids.length) return res.status(400).json({ message: 'Aucun candidat sélectionné.' });

    const eligible = [];
    for (const id of ids) {
      const c = await candidateModel.findById(id);
      if (c && c.statut === 'paiement_en_attente') eligible.push(c.id);
    }
    if (!eligible.length) {
      return res.status(400).json({
        message: 'Sélectionnez des candidats en « Paiement en attente ».',
      });
    }

    await candidateModel.updateStatus(eligible, 'paiement_confirme', 'Paiement validé');

    const settings = await settingsModel.get();
    let sheetsOk = 0;
    let sheetsFail = 0;

    for (const id of eligible) {
      const candidate = await candidateModel.findById(id);
      const mail = buildPaymentConfirmedEmail(candidate, settings);
      await emailQueueModel.sendImmediate({
        candidate_id: candidate.id,
        email_to: candidate.email,
        type: 'payment_confirmed',
        subject: mail.subject,
        body: mail.text,
        html: mail.html,
      });

      if (!candidate.sheets_exported_at) {
        const result = await googleSheets.appendPaidCandidate(candidate);
        if (result.synced) {
          await candidateModel.markSheetsExported(candidate.id);
          sheetsOk += 1;
        } else if (!result.skipped) {
          sheetsFail += 1;
        }
      }
    }

    let message = 'Paiements confirmés et emails programmés.';
    if (googleSheets.isConfigured()) {
      message += ` Google Sheet : ${sheetsOk} exporté(s)`;
      if (sheetsFail) message += `, ${sheetsFail} échec(s)`;
      message += '.';
    } else {
      message += ' (Google Sheet non configuré)';
    }

    res.json({ message, count: eligible.length, sheetsOk, sheetsFail });
  } catch (err) {
    next(err);
  }
}

/* ─── Slots ─── */

async function listSlots(_req, res, next) {
  try {
    res.json(await slotModel.getAll());
  } catch (err) {
    next(err);
  }
}

async function createSlot(req, res, next) {
  try {
    const { date_slot, heure_slot, max_places, lieu } = req.body;
    if (!date_slot || !heure_slot) {
      return res.status(400).json({ message: 'Date et heure requises.' });
    }
    const max = Number(max_places || 10);
    if (!Number.isFinite(max) || max < 1) {
      return res.status(400).json({ message: 'Nombre de places invalide.' });
    }
    const row = await slotModel.create({
      date_slot,
      heure_slot,
      max_places: max,
      lieu,
    });
    res.status(201).json(row);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Ce créneau existe déjà.' });
    }
    next(err);
  }
}

async function updateSlot(req, res, next) {
  try {
    const row = await slotModel.update(req.params.id, req.body);
    if (!row) return res.status(404).json({ message: 'Créneau introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function removeSlot(req, res, next) {
  try {
    const ok = await slotModel.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Créneau introuvable.' });
    res.json({ message: 'Créneau supprimé.' });
  } catch (err) {
    next(err);
  }
}

async function schedule(_req, res, next) {
  try {
    res.json(await slotModel.getSchedule());
  } catch (err) {
    next(err);
  }
}

/* ─── Settings + queue ─── */

async function getSettings(_req, res, next) {
  try {
    res.json(await settingsModel.get());
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    res.json(await settingsModel.update(req.body));
  } catch (err) {
    next(err);
  }
}

async function listEmails(req, res, next) {
  try {
    res.json(
      await emailQueueModel.list({
        page: Number(req.query.page || 1),
        limit: Number(req.query.limit || 20),
      })
    );
  } catch (err) {
    next(err);
  }
}

module.exports = {
  apply,
  getPublicStatus,
  getBookingPage,
  bookSlot,
  listCandidates,
  getStats,
  getCandidate,
  bulkStatus,
  removeCandidate,
  resendConfirmation,
  markPresent,
  sendSuccessPayment,
  scheduleInvitations,
  schedulePaymentRequests,
  confirmPayments,
  listSlots,
  createSlot,
  updateSlot,
  removeSlot,
  schedule,
  getSettings,
  updateSettings,
  listEmails,
};
