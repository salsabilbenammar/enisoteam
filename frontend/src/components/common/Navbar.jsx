import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import styles from './Navbar.module.css';
import { useAuth } from '../../context/AuthContext';

const links = [
  { to: '/', label: 'Accueil' },
  { to: '/about', label: 'À propos' },
  { to: '/board', label: 'Bureau' },
  { to: '/trainings', label: 'Formations' },
  { to: '/events', label: 'Événements' },
  { to: '/announcements', label: 'Annonces' },
  { to: '/rh', label: 'Coin RH', membersOnly: true },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { isAdmin, isMember, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand} onClick={() => setOpen(false)}>
          <img src="/logo.png" alt="ENISO Team" className={styles.logoImg} />
          <span className={styles.brandText}>
            <strong>ENISO Team</strong>
            <small>One Team One Dream</small>
          </span>
        </Link>

        <button
          className={styles.toggle}
          type="button"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`${styles.nav} ${open ? styles.open : ''}`}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) => (isActive ? styles.active : undefined)}
              onClick={() => setOpen(false)}
              title={l.membersOnly && !isMember ? 'Réservé aux membres inscrits' : undefined}
            >
              {l.label}
              {l.membersOnly && !isMember ? ' 🔒' : ''}
            </NavLink>
          ))}
          {isAdmin ? (
            <Link to="/admin" className={styles.cta} onClick={() => setOpen(false)}>
              Admin
            </Link>
          ) : isMember ? (
            <button type="button" className={styles.ctaBtn} onClick={handleLogout}>
              {user?.nom?.split(' ')[0] || 'Membre'} · Déconnexion
            </button>
          ) : (
            <Link to="/login" className={styles.cta} onClick={() => setOpen(false)}>
              Connexion
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
