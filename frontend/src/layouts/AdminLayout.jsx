import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './AdminLayout.module.css';

const links = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/announcements', label: 'Annonces' },
  { to: '/admin/board', label: 'Bureau' },
  { to: '/admin/gallery', label: 'Médias accueil' },
  { to: '/admin/trainings', label: 'Formations' },
  { to: '/admin/events', label: 'Événements' },
  { to: '/admin/recruitment', label: 'Recrutement' },
  { to: '/admin/rh', label: 'Coin RH' },
  { to: '/admin/club-info', label: 'À propos' },
  { to: '/admin/contact', label: 'Contact & réseaux' },
];

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
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
