const emailQueueModel = require('../models/recruitmentEmailQueueModel');

let started = false;

function startRecruitmentCron() {
  if (started) return;
  started = true;

  let cron;
  try {
    cron = require('node-cron');
  } catch {
    console.warn('[recruitment] node-cron indisponible');
    started = false;
    return;
  }

  // Toutes les minutes — un seul worker (évite les doubles si le module est rechargé)
  cron.schedule('* * * * *', async () => {
    try {
      const n = await emailQueueModel.processDue(30);
      if (n > 0) console.log(`[recruitment] ${n} email(s) traité(s)`);
    } catch (err) {
      console.error('[recruitment] cron error:', err.message);
    }
  });

  console.log('[recruitment] Cron emails démarré (chaque minute)');
}

module.exports = { startRecruitmentCron };
