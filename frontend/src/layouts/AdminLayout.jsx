import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import styles from './AdminLayout.module.css';

const links = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/announcements', label: 'Annonces' },
  { to: '/admin/board', label: 'Bureau' },
  { to: '/admin/gallery', label: 'Médias accueil' },
  { to: '/admin/trainings', label: 'Formations' },
  { to: '/admin/events', label: 'Événements' },
  { to: '/admin/recruitment', label: 'Recrutement' },
  { to: '/admin/finance', label: 'Finance' },
  { to: '/admin/deplacements', label: 'Car & compétitions' },
  { to: '/admin/projects', label: 'Projets' },
  { to: '/admin/logistique', label: 'Logistique' },
  { to: '/admin/pv-reunions', label: 'PV des réunions' },
  { to: '/admin/listes-presence', label: 'Listes de présence' },
  { to: '/admin/rh', label: 'Coin RH' },
  { to: '/admin/club-info', label: 'À propos' },
  { to: '/admin/contact', label: 'Contact & réseaux' },
];

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [hasMyProject, setHasMyProject] = useState(false);

  useEffect(() => {
    api
      .get('/projects/my-assignments')
      .then((res) => setHasMyProject(Array.isArray(res.data) && res.data.length > 0))
      .catch(() => setHasMyProject(false));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img src="/logo.png" alt="ENISO Team" className={styles.logo} />
          <div>
            <strong>ENISO Team</strong>
            <span>Administration</span>
          </div>
        </div>
        <nav className={styles.nav}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? styles.active : undefined)}
            >
              {l.label}
            </NavLink>
          ))}
          {hasMyProject ? (
            <Link to="/mes-projets" className={styles.workspaceLink}>
              Mon projet (étapes)
            </Link>
          ) : null}
        </nav>
        <div className={styles.user}>
          <p>{admin?.nom}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout}>
            Déconnexion
          </button>
          <NavLink to="/" className={styles.back}>
            ← Site public
          </NavLink>
        </div>
      </aside>
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
