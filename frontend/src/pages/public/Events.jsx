import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { assetUrl } from '../../services/api';
import Loader from '../../components/common/Loader';
import styles from './ActivityCards.module.css';

export default function Events() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/events')
      .then((res) => setItems(res.data))
      .catch(() => setError('Impossible de charger les événements.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="page">
      <div className="container">
        <header className="page-header">
          <h1>Événements</h1>
          <p>Compétitions, hackathons et rencontres du club.</p>
        </header>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="grid grid-2">
          {items.map((e) => (
            <article key={e.id} className={`card ${styles.card}`}>
              {e.image && (
                <img src={assetUrl(e.image)} alt={e.titre} className={styles.cover} />
              )}
              <div className="meta">
                <span className={`badge ${e.statut === 'a_venir' ? 'badge-accent' : 'badge-muted'}`}>
                  {e.statut === 'a_venir' ? 'À venir' : 'Passé'}
                </span>
                <span>{new Date(e.date).toLocaleString('fr-FR')}</span>
              </div>
              <h3>{e.titre}</h3>
              <p>{e.description}</p>
              {e.lieu && <p className={styles.metaLine}>📍 {e.lieu}</p>}

              <div className={styles.actions}>
                {e.inscription_ouverte ? (
                  <Link to={`/events/${e.id}/inscription`} className={`btn btn-primary ${styles.joinBtn}`}>
                    <span className={styles.joinIcon} aria-hidden>
                      ✎
                    </span>
                    Register
                  </Link>
                ) : (
                  <span className={styles.closed}>Registration closed</span>
                )}
              </div>
            </article>
          ))}
        </div>
        {!error && items.length === 0 && <div className="empty">Aucun événement publié.</div>}
      </div>
    </div>
  );
}
