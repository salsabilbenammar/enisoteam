require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const path = require('path');
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const errorMiddleware = require('./middlewares/errorMiddleware');
const { uploadsRoot } = require('./middlewares/uploadMiddleware');

const authRoutes = require('./routes/authRoutes');
const clubInfoRoutes = require('./routes/clubInfoRoutes');
const boardRoutes = require('./routes/boardRoutes');
const trainingRoutes = require('./routes/trainingRoutes');
const eventRoutes = require('./routes/eventRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const siteSettingsRoutes = require('./routes/siteSettingsRoutes');
const galleryRoutes = require('./routes/galleryRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = new Set(
        String(process.env.FRONTEND_URL || 'http://localhost:5173')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      );
      allowed.add('http://localhost:5173');
      allowed.add('http://127.0.0.1:5173');
      if (!origin || allowed.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origine CORS non autorisée: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Docs d'étapes : non servies en public (accès via API membres uniquement)
app.use('/uploads/project-steps', (_req, res) => {
  res.status(403).json({
    message: 'Documentation réservée aux membres ENISO Team. Connectez-vous pour y accéder.',
  });
});

app.use('/uploads', express.static(uploadsRoot));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected', message: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/members', require('./routes/memberRoutes'));
app.use('/api/club-info', clubInfoRoutes);
app.use('/api/board', boardRoutes);
app.use('/api/trainings', trainingRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/site-settings', siteSettingsRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/rh', require('./routes/rhRoutes'));
app.use('/api/recruitment', require('./routes/recruitmentRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/finance', require('./routes/financeRoutes'));

app.use((_req, res) => {
  res.status(404).json({ message: 'Route introuvable.' });
});

app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`ENISO Team API démarrée sur http://localhost:${PORT}`);
  require('./services/recruitmentCron').startRecruitmentCron();
});
