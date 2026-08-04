const pool = require('../config/db');

const DEFAULT_MAIL_CONFIRMATION_CORPS = `Bonjour [Nom],

Nous avons bien reçu votre candidature.

Votre dossier est enregistré. Merci de choisir dès maintenant l'un des créneaux d'entretien disponibles via ce lien sécurisé :

[Lien]

Une fois votre créneau confirmé, vous recevrez un email de confirmation avec la date, l'heure et le lieu.

Merci.

— ENISO Team`;

const DEFAULT_MAIL_REUSSITE_CORPS = `Bonjour [Nom],

Félicitations ! Vous avez réussi votre entretien d'intégration à l'ENISO Team.

Pour finaliser votre adhésion, merci de régler les frais auprès du trésorier dans le délai indiqué :

Montant : [Montant]
Délai : [Delai]
Trésorier : [Tresorier]
Contact : [Contact]

[Infos]

Merci.

— ENISO Team`;

const DEFAULT_MAIL_PAIEMENT_CORPS = `Bonjour [Nom],

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

const DEFAULTS = {
  id: 1,
  montant_paiement: '30 DT',
  delai_paiement: '7 jours',
  tresorier_nom: 'Trésorier ENISO Team',
  tresorier_contact: '',
  infos_paiement:
    'Paiement en espèces ou virement. Conservez votre preuve de paiement.',
  lieu_defaut: 'ENISO — Salle à confirmer',
  infos_entretien:
    "Merci d'arriver 10 minutes avant l'heure prévue. Apportez votre carte d'étudiant.",
  candidature_ouverte: 0,
  lien_messenger: '',
  lien_facebook: '',
  mail_confirmation_sujet: 'Confirmation de candidature',
  mail_confirmation_corps: DEFAULT_MAIL_CONFIRMATION_CORPS,
  mail_reussite_sujet: 'Félicitations — entretien réussi',
  mail_reussite_corps: DEFAULT_MAIL_REUSSITE_CORPS,
  mail_paiement_sujet: 'Paiement confirmé — vos identifiants membre ENISO Team',
  mail_paiement_corps: DEFAULT_MAIL_PAIEMENT_CORPS,
};

function normalize(row) {
  const mailPaiementCorps = row?.mail_paiement_corps || DEFAULTS.mail_paiement_corps;
  // Ancien modèle sans identifiants → bascule sur le modèle avec Email / Password / LienConnexion
  const paiementHasCreds =
    String(mailPaiementCorps).includes('[Password]') &&
    String(mailPaiementCorps).includes('[Email]');

  return {
    ...DEFAULTS,
    ...row,
    candidature_ouverte: Number(row?.candidature_ouverte) === 1 || row?.candidature_ouverte === true,
    lien_messenger: row?.lien_messenger || '',
    lien_facebook: row?.lien_facebook || '',
    mail_confirmation_sujet:
      row?.mail_confirmation_sujet || DEFAULTS.mail_confirmation_sujet,
    mail_confirmation_corps:
      row?.mail_confirmation_corps || DEFAULTS.mail_confirmation_corps,
    mail_reussite_sujet: row?.mail_reussite_sujet || DEFAULTS.mail_reussite_sujet,
    mail_reussite_corps: row?.mail_reussite_corps || DEFAULTS.mail_reussite_corps,
    mail_paiement_sujet: paiementHasCreds
      ? row?.mail_paiement_sujet || DEFAULTS.mail_paiement_sujet
      : DEFAULTS.mail_paiement_sujet,
    mail_paiement_corps: paiementHasCreds ? mailPaiementCorps : DEFAULTS.mail_paiement_corps,
  };
}

async function get() {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM recruitment_settings WHERE id = 1 LIMIT 1`
    );
    if (rows[0]) {
      const rawCorps = rows[0].mail_paiement_corps || '';
      const outdated =
        !String(rawCorps).includes('[Password]') || !String(rawCorps).includes('[Email]');
      if (outdated) {
        // Mise à jour SQL directe (sans appeler update() → évite récursion get↔update)
        try {
          await pool.execute(
            `UPDATE recruitment_settings
             SET mail_paiement_sujet = ?, mail_paiement_corps = ?
             WHERE id = 1`,
            [DEFAULTS.mail_paiement_sujet, DEFAULTS.mail_paiement_corps]
          );
          rows[0].mail_paiement_sujet = DEFAULTS.mail_paiement_sujet;
          rows[0].mail_paiement_corps = DEFAULTS.mail_paiement_corps;
        } catch {
          // ignore si colonnes absentes
        }
      }
      return normalize(rows[0]);
    }
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== 'ER_BAD_FIELD_ERROR') throw err;
  }
  return normalize(DEFAULTS);
}

function asBool01(value, fallback) {
  if (value === undefined) return fallback ? 1 : 0;
  return value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0;
}

async function update(data) {
  const current = await get();
  const payload = {
    montant_paiement: data.montant_paiement ?? current.montant_paiement,
    delai_paiement: data.delai_paiement ?? current.delai_paiement,
    tresorier_nom: data.tresorier_nom ?? current.tresorier_nom,
    tresorier_contact: data.tresorier_contact ?? current.tresorier_contact,
    infos_paiement: data.infos_paiement ?? current.infos_paiement,
    lieu_defaut: data.lieu_defaut ?? current.lieu_defaut,
    infos_entretien: data.infos_entretien ?? current.infos_entretien,
    candidature_ouverte: asBool01(data.candidature_ouverte, current.candidature_ouverte),
    lien_messenger: String(data.lien_messenger ?? current.lien_messenger ?? '').trim(),
    lien_facebook: String(data.lien_facebook ?? current.lien_facebook ?? '').trim(),
    mail_confirmation_sujet: String(
      data.mail_confirmation_sujet ?? current.mail_confirmation_sujet
    )
      .trim()
      .slice(0, 255),
    mail_confirmation_corps: String(
      data.mail_confirmation_corps ?? current.mail_confirmation_corps
    ),
    mail_reussite_sujet: String(data.mail_reussite_sujet ?? current.mail_reussite_sujet)
      .trim()
      .slice(0, 255),
    mail_reussite_corps: String(data.mail_reussite_corps ?? current.mail_reussite_corps),
    mail_paiement_sujet: String(data.mail_paiement_sujet ?? current.mail_paiement_sujet)
      .trim()
      .slice(0, 255),
    mail_paiement_corps: String(data.mail_paiement_corps ?? current.mail_paiement_corps),
  };

  try {
    await pool.execute(
      `INSERT INTO recruitment_settings
        (id, montant_paiement, delai_paiement, tresorier_nom, tresorier_contact,
         infos_paiement, lieu_defaut, infos_entretien, candidature_ouverte,
         lien_messenger, lien_facebook,
         mail_confirmation_sujet, mail_confirmation_corps,
         mail_reussite_sujet, mail_reussite_corps,
         mail_paiement_sujet, mail_paiement_corps)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        montant_paiement = VALUES(montant_paiement),
        delai_paiement = VALUES(delai_paiement),
        tresorier_nom = VALUES(tresorier_nom),
        tresorier_contact = VALUES(tresorier_contact),
        infos_paiement = VALUES(infos_paiement),
        lieu_defaut = VALUES(lieu_defaut),
        infos_entretien = VALUES(infos_entretien),
        candidature_ouverte = VALUES(candidature_ouverte),
        lien_messenger = VALUES(lien_messenger),
        lien_facebook = VALUES(lien_facebook),
        mail_confirmation_sujet = VALUES(mail_confirmation_sujet),
        mail_confirmation_corps = VALUES(mail_confirmation_corps),
        mail_reussite_sujet = VALUES(mail_reussite_sujet),
        mail_reussite_corps = VALUES(mail_reussite_corps),
        mail_paiement_sujet = VALUES(mail_paiement_sujet),
        mail_paiement_corps = VALUES(mail_paiement_corps)`,
      [
        payload.montant_paiement,
        payload.delai_paiement,
        payload.tresorier_nom,
        payload.tresorier_contact,
        payload.infos_paiement,
        payload.lieu_defaut,
        payload.infos_entretien,
        payload.candidature_ouverte,
        payload.lien_messenger,
        payload.lien_facebook,
        payload.mail_confirmation_sujet,
        payload.mail_confirmation_corps,
        payload.mail_reussite_sujet,
        payload.mail_reussite_corps,
        payload.mail_paiement_sujet,
        payload.mail_paiement_corps,
      ]
    );
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    await pool.execute(
      `INSERT INTO recruitment_settings
        (id, montant_paiement, delai_paiement, tresorier_nom, tresorier_contact,
         infos_paiement, lieu_defaut, infos_entretien, candidature_ouverte)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        montant_paiement = VALUES(montant_paiement),
        delai_paiement = VALUES(delai_paiement),
        tresorier_nom = VALUES(tresorier_nom),
        tresorier_contact = VALUES(tresorier_contact),
        infos_paiement = VALUES(infos_paiement),
        lieu_defaut = VALUES(lieu_defaut),
        infos_entretien = VALUES(infos_entretien),
        candidature_ouverte = VALUES(candidature_ouverte)`,
      [
        payload.montant_paiement,
        payload.delai_paiement,
        payload.tresorier_nom,
        payload.tresorier_contact,
        payload.infos_paiement,
        payload.lieu_defaut,
        payload.infos_entretien,
        payload.candidature_ouverte,
      ]
    );
  }
  return get();
}

async function isOpen() {
  const settings = await get();
  return !!settings.candidature_ouverte;
}

module.exports = {
  get,
  update,
  isOpen,
  DEFAULTS,
  DEFAULT_MAIL_CONFIRMATION_CORPS,
  DEFAULT_MAIL_REUSSITE_CORPS,
  DEFAULT_MAIL_PAIEMENT_CORPS,
};
