import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/announcements'),
      api.get('/board'),
      api.get('/trainings'),
      api.get('/events'),
      api.get('/gallery'),
      api.get('/recruitment/candidates', { params: { limit: 1 } }),
    ])
      .then(([a, b, t, e, g, r]) => {
        setStats({
          announcements: a.data.length,
          board: b.data.length,
          trainings: t.data.length,
          events: e.data.length,
          gallery: g.data.length,
          candidates: r.data.total,
        });
      })
      .catch(() => setError('Impossible de charger le tableau de bord.'));
  }, []);

  if (!stats && !error) return <Loader />;

  const cards = [
    { label: 'Annonces', value: stats?.announcements, to: '/admin/announcements' },
    { label: 'Bureau', value: stats?.board, to: '/admin/board' },
    { label: 'Médias accueil', value: stats?.gallery, to: '/admin/gallery' },
    { label: 'Formations', value: stats?.trainings, to: '/admin/trainings' },
    { label: 'Événements', value: stats?.events, to: '/admin/events' },
    { label: 'Candidats', value: stats?.candidates, to: '/admin/recruitment' },
    { label: 'Coin RH', value: '→', to: '/admin/rh' },
  ];

  return (
    <div>
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Vue d&apos;ensemble de l&apos;administration ENISO Team.</p>
      </header>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="grid grid-3">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="card" style={{ transition: 'border-color 0.2s' }}>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>{c.label}</p>
            <h2 style={{ fontSize: '2.2rem', color: 'var(--accent)', margin: '0.35rem 0 0' }}>
              {c.value ?? '—'}
            </h2>
          </Link>
        ))}
      </div>
    </div>
  );
}
