const pool = require('../config/db');

const DEFAULT_MERIT_RULES = `Comment sont calculés les mérites ?

Les mérites valorisent l'engagement des membres au sein de l'ENISo Team. Ils sont attribués selon les critères suivants :

• Participation active aux réunions et ateliers du club
• Contribution aux projets (robotique, électronique, programmation, mécanique)
• Implication dans l'organisation des événements (notamment l'ESC)
• Aide à la formation et à l'accompagnement des nouveaux membres
• Prospection et partenariats au service du club
• Respect des engagements pris envers l'équipe

Les mérites sont décidés par le bureau (RH) en fonction de la qualité et de la régularité de l'implication — il ne s'agit pas d'un score automatique.`;

const DEFAULTS = {
  id: 1,
  contact_label: 'Ressources humaines et formations',
  contact_phone: '96295048',
  instagram_url: 'https://www.instagram.com/enisoteam/',
  facebook_url: 'https://www.facebook.com/search/top?q=eniso%20team',
  linkedin_url: 'https://www.linkedin.com/company/enisoteam/',
  board_title: 'Bureau Exécutif 2026/2027',
  merit_rules: DEFAULT_MERIT_RULES,
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
  };

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
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      const e = new Error(
        'Table site_settings absente. Exécutez database/update_site_settings.sql dans phpMyAdmin.'
      );
      e.status = 503;
      throw e;
    }
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      // Fallback si merit_rules / board_title manquent : essayer sans merit_rules
      try {
        await pool.execute(
          `INSERT INTO site_settings
            (id, contact_label, contact_phone, instagram_url, facebook_url, linkedin_url, board_title)
           VALUES (1, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
            contact_label = VALUES(contact_label),
            contact_phone = VALUES(contact_phone),
            instagram_url = VALUES(instagram_url),
            facebook_url = VALUES(facebook_url),
            linkedin_url = VALUES(linkedin_url),
            board_title = VALUES(board_title)`,
          [
            payload.contact_label,
            payload.contact_phone,
            payload.instagram_url,
            payload.facebook_url,
            payload.linkedin_url,
            payload.board_title,
          ]
        );
        return { ...payload, id: 1 };
      } catch (inner) {
        const e = new Error(
          'Colonnes manquantes dans site_settings. Exécutez database/update_merit_rules.sql dans phpMyAdmin.'
        );
        e.status = 503;
        throw e;
      }
    }
    throw err;
  }

  return get();
}

module.exports = { get, update, DEFAULTS, DEFAULT_MERIT_RULES };
