const settingsModel = require('../models/financeSettingsModel');
const paymentModel = require('../models/memberPaymentModel');
const txModel = require('../models/financeTransactionModel');
const memberModel = require('../models/memberModel');
const typeModel = require('../models/financeCotisationTypeModel');
const offerModel = require('../models/financeCotisationOfferModel');
const candidateModel = require('../models/recruitmentCandidateModel');
const { sendMail } = require('../services/emailService');
const { buildCotisationPaymentEmail } = require('../services/financeMailTemplates');
const { isMediaStream } = require('../utils/recruitmentStreams');

function adminName(req) {
  return req.user?.nom || req.admin?.nom || 'admin';
}

function parsePeriod(query = {}) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-11
  const pad = (n) => String(n).padStart(2, '0');
  const period = String(query.period || query.periode || 'mois').toLowerCase();

  if (query.from && query.to) {
    return {
      from: String(query.from).slice(0, 10),
      to: String(query.to).slice(0, 10),
      period: 'custom',
      label: `${query.from} → ${query.to}`,
    };
  }

  if (period === 'annee' || period === 'year') {
    const year = Number(query.year || query.annee || y);
    return {
      from: `${year}-01-01`,
      to: `${year}-12-31`,
      period: 'annee',
      label: `Année ${year}`,
      year,
    };
  }

  if (period === 'trimestre' || period === 'quarter') {
    const year = Number(query.year || query.annee || y);
    const q = Math.min(4, Math.max(1, Number(query.quarter || query.trimestre || Math.floor(m / 3) + 1)));
    const startMonth = (q - 1) * 3;
    const endMonth = startMonth + 2;
    const lastDay = new Date(year, endMonth + 1, 0).getDate();
    return {
      from: `${year}-${pad(startMonth + 1)}-01`,
      to: `${year}-${pad(endMonth + 1)}-${pad(lastDay)}`,
      period: 'trimestre',
      label: `T${q} ${year}`,
      year,
      quarter: q,
    };
  }

  // mois (défaut)
  const year = Number(query.year || query.annee || y);
  const month = Math.min(12, Math.max(1, Number(query.month || query.mois || m + 1)));
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
    period: 'mois',
    label: `${pad(month)}/${year}`,
    year,
    month,
  };
}

async function getSettings(_req, res, next) {
  try {
    const [settings, types] = await Promise.all([
      settingsModel.get(),
      typeModel.list(),
    ]);
    res.json({ ...settings, types });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    if (Array.isArray(req.body.types)) {
      await typeModel.upsertMany(req.body.types);
    }
    if (req.body.cotisation_montant !== undefined) {
      const montant = Number(req.body.cotisation_montant);
      if (!Number.isFinite(montant) || montant < 0) {
        return res.status(400).json({ message: 'Montant de cotisation invalide.' });
      }
    }
    const settings = await settingsModel.update(req.body);
    const types = await typeModel.list();
    res.json({ ...settings, types });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({
        message: 'Tables finance absentes. Exécutez: node database/migrate_finance_module.js',
      });
    }
    next(err);
  }
}

async function listCotisationTypes(_req, res, next) {
  try {
    res.json(await typeModel.list({ activeOnly: true }));
  } catch (err) {
    next(err);
  }
}

async function listCotisations(req, res, next) {
  try {
    const data = await paymentModel.listCotisations({
      annee: req.query.annee,
      type: req.query.type || 'recrutement',
      statut: req.query.statut || '',
      search: req.query.search || '',
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
    });
    const types = await typeModel.list({ activeOnly: true });
    res.json({
      ...data,
      types,
      statusLabels: {
        paye: 'Payé',
        en_attente: 'En attente',
        en_retard: 'En retard',
      },
      methodLabels: paymentModel.METHOD_LABELS,
    });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({
        message: 'Tables finance absentes. Exécutez: node database/migrate_finance_module.js',
      });
    }
    next(err);
  }
}

async function listPayments(req, res, next) {
  try {
    res.json(await paymentModel.listPayments({
      member_id: req.query.member_id || '',
      annee: req.query.annee || '',
      type: req.query.type || '',
      methode: req.query.methode || '',
      from: req.query.from || '',
      to: req.query.to || '',
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 50),
    }));
  } catch (err) {
    next(err);
  }
}

async function memberPaymentHistory(req, res, next) {
  try {
    const member = await memberModel.findById(req.params.memberId);
    if (!member) return res.status(404).json({ message: 'Membre introuvable.' });
    const payments = await paymentModel.listByMember(member.id, {
      annee: req.query.annee,
      type: req.query.type,
    });
    const typeMap = await typeModel.getMap();
    res.json({
      member,
      payments,
      methodLabels: paymentModel.METHOD_LABELS,
      typeLabels: Object.fromEntries(
        Object.values(typeMap).map((t) => [t.code, t.label])
      ),
    });
  } catch (err) {
    next(err);
  }
}

async function createPayment(req, res, next) {
  try {
    const memberId = Number(req.body.member_id);
    const montant = Number(req.body.montant);
    const methode = String(req.body.methode || '').trim();
    const date_paiement = String(req.body.date_paiement || '').slice(0, 10);
    const settings = await settingsModel.get();
    const annee = Number(req.body.annee_cotisation || settings.cotisation_annee);
    const typeCode = String(req.body.cotisation_type || 'recrutement').trim();
    const typeRow = await typeModel.findByCode(typeCode);
    const detailRefId = req.body.detail_ref_id ? Number(req.body.detail_ref_id) : null;
    let detailNom = req.body.detail_nom ? String(req.body.detail_nom).trim() : '';
    const detailOption = req.body.detail_option
      ? String(req.body.detail_option).trim()
      : '';

    if (!memberId) return res.status(400).json({ message: 'Membre requis.' });
    if (!typeRow) {
      return res.status(400).json({ message: 'Type de cotisation invalide.' });
    }
    if (!Number.isFinite(montant) || montant <= 0) {
      return res.status(400).json({ message: 'Montant invalide.' });
    }
    if (!paymentModel.METHODS.includes(methode)) {
      return res.status(400).json({
        message: 'Méthode invalide (especes, cheque, virement, carte).',
      });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date_paiement)) {
      return res.status(400).json({ message: 'Date de paiement invalide.' });
    }

    // Résoudre la référence formulaire + vérifier éligibilité
    let eligible = [];
    if (typeCode === 'formation') {
      if (!detailRefId) {
        return res.status(400).json({ message: 'Choisissez une formation.' });
      }
      const training = await offerModel.findTraining(detailRefId);
      if (!training) return res.status(404).json({ message: 'Formation introuvable.' });
      detailNom = training.titre;
      eligible = await offerModel.eligibleMembersForTraining(detailRefId);
    } else if (typeCode === 'evenement') {
      if (!detailRefId) {
        return res.status(400).json({ message: 'Choisissez un événement.' });
      }
      const event = await offerModel.findEvent(detailRefId);
      if (!event) return res.status(404).json({ message: 'Événement introuvable.' });
      detailNom = event.titre;
      eligible = await offerModel.eligibleMembersForEvent(detailRefId);
    } else if (['pull', 'deplacement', 'robot'].includes(typeCode)) {
      if (!detailRefId) {
        return res.status(400).json({ message: 'Choisissez le formulaire / offre concerné.' });
      }
      const offer = await offerModel.findOffer(detailRefId);
      if (!offer || offer.cotisation_type !== typeCode) {
        return res.status(404).json({ message: 'Offre introuvable pour ce type.' });
      }
      detailNom = offer.titre;
      eligible = await offerModel.eligibleMembersForOffer(detailRefId);
      if (typeCode === 'pull' && !['tshirt', 'capuche'].includes(detailOption)) {
        return res.status(400).json({
          message: 'Pour le pull, choisissez t-shirt ou capuche.',
        });
      }
    } else if (typeCode === 'recrutement') {
      eligible = await offerModel.eligibleMembersForRecrutement();
    }

    if (typeCode !== 'recrutement' || eligible.length) {
      const ok = eligible.some((m) => Number(m.id) === memberId);
      if (typeCode !== 'recrutement' && !ok) {
        return res.status(400).json({
          message:
            'Ce membre n’a pas rempli le formulaire correspondant. Choisissez parmi la liste filtrée.',
        });
      }
      if (typeCode === 'recrutement' && eligible.length && !ok) {
        return res.status(400).json({
          message:
            'Ce membre n’apparaît pas dans les candidats au recrutement (email).',
        });
      }
    }

    const member = await memberModel.findById(memberId);
    if (!member) return res.status(404).json({ message: 'Membre introuvable.' });

    const optionLabel =
      detailOption === 'tshirt'
        ? 'T-shirt'
        : detailOption === 'capuche'
          ? 'Capuche'
          : '';

    let payment = await paymentModel.create({
      member_id: memberId,
      montant,
      date_paiement,
      methode,
      annee_cotisation: annee,
      cotisation_type: typeRow.code,
      detail_nom: detailNom || null,
      detail_option: typeRow.code === 'pull' ? detailOption : null,
      detail_ref_id: detailRefId,
      note: req.body.note ? String(req.body.note).trim() : null,
      created_by: adminName(req),
    });

    const extras = [
      detailNom,
      optionLabel,
      req.body.note ? String(req.body.note).trim() : '',
    ]
      .filter(Boolean)
      .join(' — ');

    const tx = await txModel.create(
      {
        type: 'recette',
        montant,
        categorie: 'cotisation',
        date_transaction: date_paiement,
        description: `${typeRow.label} ${annee} — ${member.nom}${
          extras ? ` — ${extras}` : ''
        }`,
        member_payment_id: payment.id,
      },
      adminName(req)
    );
    payment = await paymentModel.linkTransaction(payment.id, tx.id);

    let emailSent = false;
    let recruitmentUpdated = false;
    const memberEmail = String(member.email || '').trim().toLowerCase();
    if (memberEmail) {
      try {
        const mail = buildCotisationPaymentEmail({
          member,
          payment,
          typeLabel: typeRow.label,
          settings,
          detailLabel: [detailNom, optionLabel].filter(Boolean).join(' — '),
          methodLabel: paymentModel.METHOD_LABELS[methode] || methode,
        });
        await sendMail({
          to: memberEmail,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
        });
        emailSent = true;
      } catch (mailErr) {
        console.error('[finance] Email confirmation paiement:', mailErr.message);
      }
    }

    // Cotisation recrutement : passe le candidat en « paiement confirmé »
    // (le mail d’accès membre reste un envoi manuel côté recrutement).
    if (typeCode === 'recrutement' && memberEmail) {
      try {
        const candidate = await candidateModel.findByEmail(memberEmail);
        if (
          candidate &&
          !isMediaStream(candidate.stream) &&
          ['paiement_en_attente', 'accepte'].includes(candidate.statut)
        ) {
          await candidateModel.updateStatus(
            [candidate.id],
            'paiement_confirme',
            'Paiement cotisation recrutement enregistré (trésorerie)'
          );
          recruitmentUpdated = true;
        }
      } catch (recruitErr) {
        console.error('[finance] Mise à jour statut recrutement:', recruitErr.message);
      }
    }

    const parts = ['Paiement enregistré.'];
    if (emailSent) parts.push('Email de confirmation envoyé au membre.');
    if (recruitmentUpdated) {
      parts.push('Candidat passé en « Paiement confirmé » (recrutement).');
    }

    res.status(201).json({
      message: parts.join(' '),
      payment,
      transaction: tx,
      emailSent,
      recruitmentUpdated,
    });
  } catch (err) {
    next(err);
  }
}

async function removePayment(req, res, next) {
  try {
    const payment = await paymentModel.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Paiement introuvable.' });

    if (payment.transaction_id) {
      await txModel.remove(payment.transaction_id, adminName(req));
    }
    await paymentModel.remove(payment.id);
    res.json({ message: 'Paiement supprimé.' });
  } catch (err) {
    next(err);
  }
}

async function listTransactions(req, res, next) {
  try {
    res.json({
      ...(await txModel.list({
        type: req.query.type || '',
        categorie: req.query.categorie || '',
        from: req.query.from || '',
        to: req.query.to || '',
        search: req.query.search || '',
        page: Number(req.query.page || 1),
        limit: Number(req.query.limit || 30),
      })),
      categories: txModel.CATEGORIES,
      categoryLabels: txModel.CATEGORY_LABELS,
      types: txModel.TYPES,
    });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({
        message: 'Tables finance absentes. Exécutez: node database/migrate_finance_module.js',
      });
    }
    next(err);
  }
}

async function createTransaction(req, res, next) {
  try {
    const type = String(req.body.type || '').trim();
    const montant = Number(req.body.montant);
    const categorie = String(req.body.categorie || '').trim();
    const date_transaction = String(req.body.date_transaction || '').slice(0, 10);

    if (!txModel.TYPES.includes(type)) {
      return res.status(400).json({ message: 'Type invalide (depense ou recette).' });
    }
    if (!Number.isFinite(montant) || montant <= 0) {
      return res.status(400).json({ message: 'Montant invalide.' });
    }
    if (!categorie) {
      return res.status(400).json({ message: 'Catégorie requise.' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date_transaction)) {
      return res.status(400).json({ message: 'Date invalide.' });
    }

    const justificatif = req.file
      ? `/uploads/finance/${req.file.filename}`
      : null;

    const row = await txModel.create(
      {
        type,
        montant,
        categorie,
        date_transaction,
        description: req.body.description ? String(req.body.description).trim() : null,
        justificatif_path: justificatif,
      },
      adminName(req)
    );
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

async function updateTransaction(req, res, next) {
  try {
    const existing = await txModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Transaction introuvable.' });

    const type = req.body.type !== undefined ? String(req.body.type).trim() : existing.type;
    const montant =
      req.body.montant !== undefined ? Number(req.body.montant) : Number(existing.montant);
    const categorie =
      req.body.categorie !== undefined
        ? String(req.body.categorie).trim()
        : existing.categorie;
    const date_transaction =
      req.body.date_transaction !== undefined
        ? String(req.body.date_transaction).slice(0, 10)
        : String(existing.date_transaction).slice(0, 10);

    if (!txModel.TYPES.includes(type)) {
      return res.status(400).json({ message: 'Type invalide.' });
    }
    if (!Number.isFinite(montant) || montant <= 0) {
      return res.status(400).json({ message: 'Montant invalide.' });
    }

    let justificatif_path = existing.justificatif_path;
    if (req.file) {
      justificatif_path = `/uploads/finance/${req.file.filename}`;
    } else if (req.body.clear_justificatif === '1' || req.body.clear_justificatif === true) {
      justificatif_path = null;
    }

    const row = await txModel.update(
      existing.id,
      {
        type,
        montant,
        categorie,
        date_transaction,
        description:
          req.body.description !== undefined
            ? String(req.body.description || '').trim()
            : existing.description,
        justificatif_path,
      },
      adminName(req)
    );
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function removeTransaction(req, res, next) {
  try {
    const ok = await txModel.remove(req.params.id, adminName(req));
    if (!ok) return res.status(404).json({ message: 'Transaction introuvable.' });
    res.json({ message: 'Transaction supprimée.' });
  } catch (err) {
    next(err);
  }
}

async function transactionLogs(req, res, next) {
  try {
    const tx = await txModel.findById(req.params.id);
    if (!tx) return res.status(404).json({ message: 'Transaction introuvable.' });
    res.json({ transaction: tx, logs: await txModel.getLogs(tx.id) });
  } catch (err) {
    next(err);
  }
}

async function getReport(req, res, next) {
  try {
    const range = parsePeriod(req.query);
    const summary = await txModel.reportSummary({ from: range.from, to: range.to });
    const settings = await settingsModel.get();
    const cotisations = await paymentModel.cotisationRate(
      Number(req.query.annee_cotisation || range.year || settings.cotisation_annee),
      req.query.cotisation_type || 'recrutement'
    );
    res.json({
      ...summary,
      period: range,
      devise: settings.devise,
      cotisations,
      categoryLabels: txModel.CATEGORY_LABELS,
    });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({
        message: 'Tables finance absentes. Exécutez: node database/migrate_finance_module.js',
      });
    }
    next(err);
  }
}

async function exportCsv(req, res, next) {
  try {
    const range = parsePeriod(req.query);
    const rows = await txModel.listForExport({
      from: range.from,
      to: range.to,
      type: req.query.type || '',
    });
    const summary = await txModel.reportSummary({ from: range.from, to: range.to });
    const escape = (v) => {
      const s = v == null ? '' : String(v);
      if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const header = [
      'id',
      'type',
      'montant',
      'categorie',
      'date',
      'description',
      'cree_par',
      'cree_le',
    ];
    const lines = [header.join(';')];
    for (const r of rows) {
      lines.push(
        [
          r.id,
          r.type,
          Number(r.montant).toFixed(2),
          r.categorie,
          String(r.date_transaction).slice(0, 10),
          r.description || '',
          r.created_by || '',
          r.created_at ? new Date(r.created_at).toISOString() : '',
        ]
          .map(escape)
          .join(';')
      );
    }
    lines.push('');
    lines.push(`total_recettes;${summary.total_recettes.toFixed(2)}`);
    lines.push(`total_depenses;${summary.total_depenses.toFixed(2)}`);
    lines.push(`solde;${summary.solde.toFixed(2)}`);
    lines.push(`periode;${range.from};${range.to}`);

    const csv = `\uFEFF${lines.join('\n')}`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="rapport-finance-${range.from}_${range.to}.csv"`
    );
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

async function listMembersLite(_req, res, next) {
  try {
    const members = await memberModel.getAll();
    res.json(
      members
        .filter((m) => Number(m.actif) === 1)
        .map((m) => ({ id: m.id, nom: m.nom, email: m.email, filiere: m.filiere }))
    );
  } catch (err) {
    next(err);
  }
}

async function listFormOptions(req, res, next) {
  try {
    const type = String(req.query.type || '').trim();
    if (type === 'formation') {
      return res.json({ type, options: await offerModel.listPaidTrainings() });
    }
    if (type === 'evenement') {
      return res.json({ type, options: await offerModel.listEventsOptions() });
    }
    if (['pull', 'deplacement', 'robot'].includes(type)) {
      if (type === 'pull') {
        return res.json({ type, options: await offerModel.listPullForms() });
      }
      return res.json({
        type,
        options: await offerModel.listOffers({ type, openOnly: false }),
      });
    }
    if (type === 'recrutement') {
      return res.json({ type, options: [{ id: 0, titre: 'Candidature recrutement club' }] });
    }
    return res.status(400).json({ message: 'Type invalide.' });
  } catch (err) {
    next(err);
  }
}

async function listEligibleMembers(req, res, next) {
  try {
    const type = String(req.query.type || '').trim();
    const refId = Number(req.query.ref_id || 0);

    if (type === 'formation') {
      if (!refId) return res.json([]);
      return res.json(await offerModel.eligibleMembersForTraining(refId));
    }
    if (type === 'evenement') {
      if (!refId) return res.json([]);
      return res.json(await offerModel.eligibleMembersForEvent(refId));
    }
    if (['pull', 'deplacement', 'robot'].includes(type)) {
      if (!refId) return res.json([]);
      return res.json(await offerModel.eligibleMembersForOffer(refId));
    }
    if (type === 'recrutement') {
      return res.json(await offerModel.eligibleMembersForRecrutement());
    }
    return res.status(400).json({ message: 'Type invalide.' });
  } catch (err) {
    next(err);
  }
}

async function adminListOffers(req, res, next) {
  try {
    res.json(await offerModel.listOffers({ type: req.query.type || '' }));
  } catch (err) {
    next(err);
  }
}

async function adminCreateOffer(req, res, next) {
  try {
    if (!String(req.body.titre || '').trim()) {
      return res.status(400).json({ message: 'Titre requis.' });
    }
    if (!String(req.body.external_url || '').trim()) {
      return res.status(400).json({ message: 'URL du formulaire sur le site officiel requise.' });
    }
    const row = await offerModel.createOffer(req.body);
    res.status(201).json(row);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

async function adminUpdateOffer(req, res, next) {
  try {
    const row = await offerModel.updateOffer(req.params.id, req.body);
    if (!row) return res.status(404).json({ message: 'Offre introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function adminRemoveOffer(req, res, next) {
  try {
    const ok = await offerModel.removeOffer(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Offre introuvable.' });
    res.json({ message: 'Offre supprimée.' });
  } catch (err) {
    next(err);
  }
}

async function listOpenOffers(_req, res, next) {
  try {
    const [pullForms, offers] = await Promise.all([
      offerModel.listPullForms(),
      offerModel.listOffers({ openOnly: true }),
    ]);
    const pullOpen = pullForms
      .filter((o) => o.ouvert && o.external_url)
      .map(({ id, cotisation_type, titre, description, external_url, detail_option }) => ({
        id,
        cotisation_type,
        titre,
        description,
        external_url,
        detail_option,
      }));
    const otherOpen = offers
      .filter((o) => o.external_url && o.cotisation_type !== 'pull')
      .map(({ id, cotisation_type, titre, description, external_url }) => ({
        id,
        cotisation_type,
        titre,
        description,
        external_url,
      }));
    res.json([...pullOpen, ...otherOpen]);
  } catch (err) {
    next(err);
  }
}

async function adminListPullForms(_req, res, next) {
  try {
    res.json(await offerModel.listPullForms());
  } catch (err) {
    next(err);
  }
}

async function adminUpdatePullForm(req, res, next) {
  try {
    const variant = String(req.params.variant || '').trim();
    if (!['tshirt', 'capuche'].includes(variant)) {
      return res.status(400).json({ message: 'Variante invalide (tshirt ou capuche).' });
    }
    const ouvert = req.body.ouvert;
    if (ouvert === true || ouvert === 1 || ouvert === '1') {
      const url = String(req.body.external_url || '').trim();
      const existing = await offerModel.findPullForm(variant);
      const externalUrl = url || existing?.external_url || '';
      if (!externalUrl) {
        return res.status(400).json({
          message: 'Indiquez l’URL du formulaire avant de l’ouvrir.',
        });
      }
      const row = await offerModel.updatePullForm(variant, {
        external_url: externalUrl,
        ouvert: true,
      });
      return res.json({
        message: 'Formulaire ouvert — lien visible dans le menu membre.',
        form: row,
      });
    }
    if (ouvert === false || ouvert === 0 || ouvert === '0') {
      const row = await offerModel.updatePullForm(variant, { ouvert: false });
      return res.json({ message: 'Formulaire fermé.', form: row });
    }
    const row = await offerModel.updatePullForm(variant, {
      external_url: req.body.external_url,
      ouvert: req.body.ouvert,
    });
    if (!row) return res.status(404).json({ message: 'Formulaire introuvable.' });
    res.json({ message: 'Formulaire enregistré.', form: row });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

module.exports = {
  getSettings,
  updateSettings,
  listCotisationTypes,
  listCotisations,
  listPayments,
  memberPaymentHistory,
  createPayment,
  removePayment,
  listTransactions,
  createTransaction,
  updateTransaction,
  removeTransaction,
  transactionLogs,
  getReport,
  exportCsv,
  listMembersLite,
  listFormOptions,
  listEligibleMembers,
  adminListOffers,
  adminCreateOffer,
  adminUpdateOffer,
  adminRemoveOffer,
  listOpenOffers,
  adminListPullForms,
  adminUpdatePullForm,
};
