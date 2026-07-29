function errorMiddleware(err, _req, res, _next) {
  console.error(err);

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Fichier trop volumineux.' });
    }
    return res.status(400).json({ message: err.message });
  }

  if (err.message && err.message.includes('non autorisé')) {
    return res.status(400).json({ message: err.message });
  }

  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Erreur serveur interne.',
  });
}

module.exports = errorMiddleware;
