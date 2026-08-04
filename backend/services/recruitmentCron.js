const emailQueueModel = require('../models/recruitmentEmailQueueModel');

function startRecruitmentCron() {
  let cron;
  try {
    cron = require('node-cron');
  } catch {
    console.warn('[recruitment] node-cron indisponible');
    return;
  }

  // Toutes les minutes
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
