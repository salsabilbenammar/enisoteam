const pool = require('../config/db');

const DEFAULT_MERIT_RULES = `3.8 — Le système mérite

Le système mérite est un outil d'évaluation exclusif à l'ENISo Team. Il vise à valoriser le travail des membres à travers des points. Le cumul des points reflète le niveau d'implication et d'engagement du membre.

Chaque membre est soumis à une évaluation mensuelle. Cette évaluation se base sur des critères tels que : la présence aux réunions, l'accomplissement des tâches, la discipline, l'assiduité, le respect, ainsi que d'autres critères définis par le responsable RH.

Barème des points

• Présence aux réunions ordinaires — 2 points
• Présence à l'Assemblée Générale — 6 points
• Participation et le travail continu dans un projet — 5 points
• Proposition d'un projet, avec l'approbation du bureau et le travail continu sur ce projet — 8 points
• Suggestion d'une idée d'un projet réalisable — 1 point
• Participation à une compétition robotique et l'obtention d'un prix — 10 points
• Participation à une compétition robotique — 3 points
• Participation à une compétition robotique et le travail continu sur le projet — 5 points
• Participation aux sorties de sponsoring — 3 points
• Participation au sein d'un comité d'organisation — 3 points
• Décrocher un passage radio — 3 points
• Participation à l'organisation des événements du Club — 4 points
• Proposition d'un événement et le travail continu pour le faire réussir — 8 points
• Participation à une formation — 1 point
• Participation à une visite industrielle — 1 point
• Absentéisme pour trois réunions successives — −6 points

Des points supplémentaires seront attribués selon la motivation et les actions de bénévolat.`;

const DEFAULT_REGLEMENT_INTERNE = `3.2 — Droits et devoirs, comportement des membres

3.2.1. Droits

• Chaque membre a le droit de proposer un projet « innovant » au Bureau Exécutif, présenter son projet, présider son équipe du projet et se bénéficier des formations et matériels exigés après l'approbation du bureau.
• Chaque membre a le droit d'être initié au monde de la robotique et d'avoir le soutien à l'utilisation des matériels.
• Il a le droit de l'utilisation sur place le matériel du club en fonction de sa disponibilité ou l'emprunter après avoir remplir une demande d'emprunt.
• Chaque membre a le droit d'assister aux formations proposées par le responsable formation.
• Chaque membre a le droit de participer aux compétitions nationales de la robotique avec le soutien du club.

3.2.2. Devoirs

• Chaque membre doit impérativement respecter le règlement interne.
• Respecter l'ensemble du matériel du club.
• Veiller à la propreté et à la sécurité du lieu de travail, au rangement du matériel après utilisation.
• Chaque membre doit participer, au moins, à un projet.
• Participer aux activités proposées par le bureau et faire partie du comité organisateur de chaque événement du club, et essentiellement E.S.C.
• Tous les renseignements personnels communiqués au bureau de l'ENISo Team par ses membres restent confidentiels et ne sont en aucun cas communiqués à des tiers.

3.2.3. Comportement des membres

• Chaque membre s'engage à promouvoir la bonne image de l'ENISo Team et il est obligé également par son attitude ou ses déclarations à ne pas nuire à cette image.
• Les membres doivent adopter une attitude sportive et respectueuse envers les autres clubs de notre école ou des autres écoles.
• Tout comportement visant à troubler l'ordre et le bon fonctionnement du club, envers les responsables et/ou les autres adhérents, expose son propriétaire à des sanctions pouvant aller jusqu'à la révocation.
• Le non-respect de la propreté et l'organisation de l'espace du travail et du local expose l'adhérant à des avertissements et des sanctions pouvant aller jusqu'à la révocation.`;

const DEFAULTS = {
  id: 1,
  contact_label: 'Ressources humaines et formations',
  contact_phone: '96295048',
  instagram_url: 'https://www.instagram.com/enisoteam/',
  facebook_url: 'https://www.facebook.com/search/top?q=eniso%20team',
  linkedin_url: 'https://www.linkedin.com/company/enisoteam/',
  board_title: 'Bureau Exécutif 2026/2027',
  merit_rules: DEFAULT_MERIT_RULES,
  reglement_interne: DEFAULT_REGLEMENT_INTERNE,
};

async function get() {
  try {
    const [rows] = await pool.execute('SELECT * FROM site_settings WHERE id = 1 LIMIT 1');
    if (rows[0]) {
      return {
        ...DEFAULTS,
        ...rows[0],
        board_title: rows[0].board_title || DEFAULTS.board_title,
        merit_rules: rows[0].merit_rules || DEFAULTS.merit_rules,
        reglement_interne: rows[0].reglement_interne || DEFAULTS.reglement_interne,
      };
    }
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
  }
  return { ...DEFAULTS };
}

async function update(data) {
  const current = await get();
  const payload = {
    contact_label: data.contact_label?.trim() || current.contact_label || DEFAULTS.contact_label,
    contact_phone: data.contact_phone?.trim() || current.contact_phone || DEFAULTS.contact_phone,
    instagram_url:
      data.instagram_url !== undefined
        ? data.instagram_url?.trim() || ''
        : current.instagram_url || '',
    facebook_url:
      data.facebook_url !== undefined
        ? data.facebook_url?.trim() || ''
        : current.facebook_url || '',
    linkedin_url:
      data.linkedin_url !== undefined
        ? data.linkedin_url?.trim() || ''
        : current.linkedin_url || '',
    board_title:
      data.board_title !== undefined
        ? data.board_title?.trim() || DEFAULTS.board_title
        : current.board_title || DEFAULTS.board_title,
    merit_rules:
      data.merit_rules !== undefined
        ? data.merit_rules?.trim() || DEFAULTS.merit_rules
        : current.merit_rules || DEFAULTS.merit_rules,
    reglement_interne:
      data.reglement_interne !== undefined
        ? data.reglement_interne?.trim() || DEFAULTS.reglement_interne
        : current.reglement_interne || DEFAULTS.reglement_interne,
  };

  try {
    await pool.execute(
      `INSERT INTO site_settings
        (id, contact_label, contact_phone, instagram_url, facebook_url, linkedin_url, board_title, merit_rules, reglement_interne)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        contact_label = VALUES(contact_label),
        contact_phone = VALUES(contact_phone),
        instagram_url = VALUES(instagram_url),
        facebook_url = VALUES(facebook_url),
        linkedin_url = VALUES(linkedin_url),
        board_title = VALUES(board_title),
        merit_rules = VALUES(merit_rules),
        reglement_interne = VALUES(reglement_interne)`,
      [
        payload.contact_label,
        payload.contact_phone,
        payload.instagram_url,
        payload.facebook_url,
        payload.linkedin_url,
        payload.board_title,
        payload.merit_rules,
        payload.reglement_interne,
      ]
    );
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      const e = new Error(
        'Table site_settings absente. Exécutez database/update_site_settings.sql dans phpMyAdmin.'
      );
      e.status = 503;
      throw e;
    }
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      try {
        await pool.execute(
          `INSERT INTO site_settings
            (id, contact_label, contact_phone, instagram_url, facebook_url, linkedin_url, board_title, merit_rules)
           VALUES (1, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
            contact_label = VALUES(contact_label),
            contact_phone = VALUES(contact_phone),
            instagram_url = VALUES(instagram_url),
            facebook_url = VALUES(facebook_url),
            linkedin_url = VALUES(linkedin_url),
            board_title = VALUES(board_title),
            merit_rules = VALUES(merit_rules)`,
          [
            payload.contact_label,
            payload.contact_phone,
            payload.instagram_url,
            payload.facebook_url,
            payload.linkedin_url,
            payload.board_title,
            payload.merit_rules,
          ]
        );
        return { ...payload, id: 1 };
      } catch (inner) {
        const e = new Error(
          'Colonnes manquantes dans site_settings. Exécutez database/migrate_reglement_interne.js'
        );
        e.status = 503;
        throw e;
      }
    }
    throw err;
  }

  return get();
}

module.exports = { get, update, DEFAULTS, DEFAULT_MERIT_RULES, DEFAULT_REGLEMENT_INTERNE };
