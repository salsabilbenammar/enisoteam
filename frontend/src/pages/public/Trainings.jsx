import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import styles from './Trainings.module.css';

const niveauLabel = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
};

export default function Trainings() {
  const { isMember } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/trainings')
      .then((res) => setItems(res.data))
      .catch(() => setError('Impossible de charger les formations.'))
      .finally(() => setLoading(false));
  }, [isMember]);

  if (loading) return <Loader />;

  return (
    <div className="page">
      <div className="container">
        <header className="page-header">
          <h1>Formations</h1>
          <p>Ateliers techniques proposés par le club ENISO Team.</p>
        </header>

        {!isMember && (
          <div className={`alert alert-success ${styles.notice}`}>
            Les formations sont visibles par tous.{' '}
            <Link to="/login" state={{ from: '/trainings', message: 'Connectez-vous pour accéder aux ressources des formations.' }}>
              Connectez-vous
            </Link>{' '}
            avec votre compte membre pour y accéder.
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <div className="grid grid-2">
          {items.map((t) => (
            <article key={t.id} className="card">
              <div className="meta">
                <span className="badge badge-accent">{niveauLabel[t.niveau] || t.niveau}</span>
                <span>{new Date(t.date).toLocaleDateString('fr-FR')}</span>
              </div>
              <h3>{t.titre}</h3>
              <p>{t.description}</p>
              {t.formateur && <p className={styles.formateur}>Formateur : {t.formateur}</p>}

              {isMember && t.lien ? (
                <a href={t.lien} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                  Accéder à la formation
                </a>
              ) : !isMember && (t.acces_membre || t.lien) ? (
                <div className={styles.locked}>
                  <span className="badge badge-muted">🔒 Réservé aux membres</span>
                  <Link
                    to="/login"
                    state={{ from: '/trainings', message: 'Connectez-vous pour accéder à cette formation.' }}
                    className="btn btn-secondary btn-sm"
                  >
                    Se connecter
                  </Link>
                </div>
              ) : null}
            </article>
          ))}
        </div>

        {!error && items.length === 0 && <div className="empty">Aucune formation publiée.</div>}
      </div>
    </div>
  );
}
