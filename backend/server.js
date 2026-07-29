require('dotenv').config();
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
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

app.use((_req, res) => {
  res.status(404).json({ message: 'Route introuvable.' });
});

app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`ENISO Team API démarrée sur http://localhost:${PORT}`);
});
