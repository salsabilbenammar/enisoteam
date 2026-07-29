import { useEffect, useState } from 'react';
import api, { assetUrl } from '../../services/api';
import Loader from '../../components/common/Loader';

export default function Announcements() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/announcements')
      .then((res) => setItems(res.data))
      .catch(() => setError('Impossible de charger les annonces.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="page">
      <div className="container">
        <header className="page-header">
          <h1>Annonces</h1>
          <p>Fil d&apos;actualités du club.</p>
        </header>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="grid" style={{ gap: '1.25rem' }}>
          {items.map((a) => (
            <article key={a.id} className="card">
              <div className="meta">
                <span>{new Date(a.date_publication).toLocaleDateString('fr-FR')}</span>
              </div>
              <h3>{a.titre}</h3>
              {a.image && (
                <img
                  src={assetUrl(a.image)}
                  alt={a.titre}
                  style={{
                    width: '100%',
                    maxHeight: 260,
                    objectFit: 'cover',
                    borderRadius: 10,
                    margin: '0.75rem 0',
                  }}
                />
              )}
              {a.lien_formulaire && (
                <a
                  href={a.lien_formulaire}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm"
                  style={{ marginBottom: '0.75rem' }}
                >
                  Accéder au formulaire
                </a>
              )}
              <p style={{ whiteSpace: 'pre-wrap' }}>{a.contenu}</p>
            </article>
          ))}
        </div>
        {!error && items.length === 0 && <div className="empty">Aucune annonce pour le moment.</div>}
      </div>
    </div>
  );
}
