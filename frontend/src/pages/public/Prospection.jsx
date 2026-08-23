import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api, { assetUrl } from '../../services/api';
import Loader from '../../components/common/Loader';
import styles from './Prospection.module.css';

export default function Prospection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/prospection')
      .then((res) => setItems(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError('Impossible de charger les réalisations.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!items.length) return <Navigate to="/" replace />;

  return (
    <div className={`page ${styles.page}`}>
      <div className="container">
        <header className={styles.hero}>
          <p className={styles.kicker}>Partenariats</p>
          <h1>Réalisations prospection</h1>
          <p className={styles.lead}>
            Les projets et collaborations obtenus grâce à la prospection du club.
          </p>
        </header>

        {error && <div className="alert alert-error">{error}</div>}

        <div className={styles.grid}>
          {items.map((item, index) => (
            <article
              key={item.id}
              className={styles.card}
              style={{ animationDelay: `${Math.min(index, 8) * 0.05}s` }}
            >
              {item.image ? (
                <div className={styles.media}>
                  <img src={assetUrl(item.image)} alt="" />
                </div>
              ) : null}
              <div className={styles.body}>
                {item.annee ? <span className={styles.year}>{item.annee}</span> : null}
                <h2>{item.titre}</h2>
                {item.description ? (
                  <p style={{ whiteSpace: 'pre-wrap' }}>{item.description}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
