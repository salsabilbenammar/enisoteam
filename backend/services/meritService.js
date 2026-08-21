const meritModel = require('../models/meritModel');
const memberModel = require('../models/memberModel');
const attendanceModel = require('../models/attendanceModel');
const { getAction, actionForAttendanceType } = require('./meritCatalog');

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesMatch(memberNom, prenom, nom) {
  const member = normalizeName(memberNom);
  if (!member) return false;
  const forward = normalizeName(`${prenom} ${nom}`);
  const reverse = normalizeName(`${nom} ${prenom}`);
  if (!forward) return false;
  return (
    member === forward ||
    member === reverse ||
    member.includes(forward) ||
    forward.includes(member)
  );
}

async function findMemberByName(prenom, nom) {
  const members = await memberModel.getAll();
  const actifs = members.filter((m) => Number(m.actif) === 1);
  return actifs.find((m) => namesMatch(m.nom, prenom, nom)) || null;
}

async function awardAction({
  member_id,
  action_code,
  source_type = 'manual',
  source_id = null,
  pointsOverride = null,
  motifExtra = '',
}) {
  const action = getAction(action_code);
  if (!action) {
    const err = new Error('Action mérite inconnue.');
    err.status = 400;
    throw err;
  }

  let points = action.customPoints ? Number(pointsOverride) : Number(action.points);
  if (!Number.isFinite(points) || points === 0) {
    const err = new Error('Nombre de points invalide.');
    err.status = 400;
    throw err;
  }

  const motif = motifExtra
    ? `${action.label} — ${motifExtra}`
    : action.label;

  if (source_type !== 'manual' && source_id != null) {
    const existing = await meritModel.findBySource(
      member_id,
      action_code,
      source_type,
      source_id
    );
    if (existing) return { entry: existing, created: false };
  }

  try {
    const entry = await meritModel.create({
      member_id,
      points,
      motif,
      action_code,
      source_type,
      source_id,
    });
    return { entry, created: true };
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' && source_type !== 'manual' && source_id != null) {
      const existing = await meritModel.findBySource(
        member_id,
        action_code,
        source_type,
        source_id
      );
      if (existing) return { entry: existing, created: false };
    }
    throw err;
  }
}

async function awardAttendanceEntry(session, entry) {
  const action = actionForAttendanceType(session.type);
  if (!action) return null;

  let memberId = entry.member_id ? Number(entry.member_id) : null;
  if (!memberId) {
    const member = await findMemberByName(entry.prenom, entry.nom);
    if (!member) return null;
    memberId = member.id;
    try {
      await attendanceModel.setEntryMember(entry.id, memberId);
    } catch {
      /* colonne optionnelle */
    }
  }

  return awardAction({
    member_id: memberId,
    action_code: action.code,
    source_type: 'attendance',
    source_id: entry.id,
  });
}

async function syncAttendanceSession(sessionId) {
  const session = await attendanceModel.getById(sessionId);
  if (!session) return { awarded: 0, unmatched: 0 };
  const entries = await attendanceModel.listEntries(sessionId);
  let awarded = 0;
  let unmatched = 0;
  for (const entry of entries) {
    const result = await awardAttendanceEntry(session, entry);
    if (!result) unmatched += 1;
    else if (result.created) awarded += 1;
  }
  return { awarded, unmatched, total: entries.length };
}

async function resolveMemberIdFromRegistration(reg) {
  if (reg.member_id) return Number(reg.member_id);
  if (reg.email) {
    const email = String(reg.email).trim();
    let byEmail = await memberModel.findByEmail(email);
    if (!byEmail && email !== email.toLowerCase()) {
      byEmail = await memberModel.findByEmail(email.toLowerCase());
    }
    if (byEmail && Number(byEmail.actif) === 1) return Number(byEmail.id);
  }
  const byName = await findMemberByName(reg.prenom, reg.nom);
  return byName ? Number(byName.id) : null;
}

/**
 * Attribue +3 (participation compétition) aux inscrits présents sur la liste finale
 * d’un déplacement car & compétitions.
 */
async function awardDeplacementListeFinale(trip, listeFinale, registrations) {
  if (!trip || !Array.isArray(registrations) || !registrations.length) {
    return { awarded: 0, unmatched: 0 };
  }

  const personnes = Array.isArray(listeFinale?.personnes) ? listeFinale.personnes : [];
  const spectatorIds = new Set(
    (Array.isArray(listeFinale?.spectator_ids) ? listeFinale.spectator_ids : [])
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n))
  );

  const chosenRegIds = new Set();
  for (const person of personnes) {
    const raw = String(person?.id || '');
    const match = raw.match(/^(?:comp|spec)-(\d+)/);
    if (match) chosenRegIds.add(Number(match[1]));
  }
  for (const sid of spectatorIds) chosenRegIds.add(sid);

  for (const reg of registrations) {
    if (reg.role_candidat === 'competiteur') {
      chosenRegIds.add(Number(reg.id));
    }
  }

  let awarded = 0;
  let unmatched = 0;
  const tripTitle = trip.titre || 'Déplacement';

  for (const reg of registrations) {
    if (!chosenRegIds.has(Number(reg.id))) continue;

    const memberId = await resolveMemberIdFromRegistration(reg);
    if (!memberId) {
      unmatched += 1;
      continue;
    }

    const result = await awardAction({
      member_id: memberId,
      action_code: 'competition',
      source_type: 'deplacement_liste',
      source_id: Number(reg.id),
      motifExtra: tripTitle,
    });
    if (result.created) awarded += 1;
  }

  return { awarded, unmatched };
}

async function syncDeplacementListes() {
  const deplacementModel = require('../models/deplacementModel');
  const trips = await deplacementModel.getAll();
  let awarded = 0;
  let unmatched = 0;
  for (const trip of trips) {
    const liste = trip.liste_finale;
    if (!liste || !Array.isArray(liste.personnes) || !liste.personnes.length) continue;
    const regs = await deplacementModel.listRegistrations(trip.id);
    const result = await awardDeplacementListeFinale(trip, liste, regs);
    awarded += result.awarded;
    unmatched += result.unmatched;
  }
  return { awarded, unmatched };
}

async function syncAllAttendance() {
  const sessions = await attendanceModel.getAll();
  let awarded = 0;
  let unmatched = 0;
  for (const session of sessions) {
    const r = await syncAttendanceSession(session.id);
    awarded += r.awarded;
    unmatched += r.unmatched;
  }
  const absenteeism = await syncAbsenteeism();
  const deplacements = await syncDeplacementListes();
  awarded += deplacements.awarded;
  unmatched += deplacements.unmatched;
  return { awarded, unmatched, absenteeism, deplacements };
}

/**
 * Pour chaque membre actif : si 3 réunions ordinaires successives sans présence → −6.
 * source_id = id de la 3e séance manquée (idempotent).
 */
async function syncAbsenteeism() {
  const sessions = (await attendanceModel.getAll())
    .filter((s) => s.type === 'reunion')
    .slice()
    .sort((a, b) => {
      const da = String(a.date_seance || a.created_at || '');
      const db = String(b.date_seance || b.created_at || '');
      if (da !== db) return da.localeCompare(db);
      return Number(a.id) - Number(b.id);
    });

  if (sessions.length < 3) return { awarded: 0 };

  const members = (await memberModel.getAll()).filter((m) => Number(m.actif) === 1);
  const presenceBySession = new Map();
  for (const session of sessions) {
    const entries = await attendanceModel.listEntries(session.id);
    const presentIds = new Set();
    for (const entry of entries) {
      if (entry.member_id) {
        presentIds.add(Number(entry.member_id));
        continue;
      }
      const member = members.find((m) => namesMatch(m.nom, entry.prenom, entry.nom));
      if (member) presentIds.add(Number(member.id));
    }
    presenceBySession.set(Number(session.id), presentIds);
  }

  let awarded = 0;
  for (const member of members) {
    let streak = 0;
    for (const session of sessions) {
      const present = presenceBySession.get(Number(session.id))?.has(Number(member.id));
      if (present) {
        streak = 0;
        continue;
      }
      streak += 1;
      if (streak >= 3 && streak % 3 === 0) {
        const result = await awardAction({
          member_id: member.id,
          action_code: 'absenteisme_3_reunions',
          source_type: 'absenteeism',
          source_id: session.id,
        });
        if (result.created) awarded += 1;
      }
    }
  }
  return { awarded };
}

module.exports = {
  normalizeName,
  findMemberByName,
  awardAction,
  awardAttendanceEntry,
  awardDeplacementListeFinale,
  syncAttendanceSession,
  syncAllAttendance,
  syncAbsenteeism,
  syncDeplacementListes,
};
