import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isBureauRole } from '../../utils/bureauPermissions';
import styles from './Login.module.css';

function safePublicRedirect(from) {
  if (!from || typeof from !== 'string') return '/';
  if (!from.startsWith('/') || from.startsWith('//')) return '/';
  if (from.startsWith('/admin')) return '/';
  if (from === '/login') return '/';
  return from;
}

export default function Login() {
  const { login, logout, isAuthenticated, isAdmin, isClubMemberOnly, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const infoMessage = location.state?.message || '';
  const from = safePublicRedirect(location.state?.from);

  useEffect(() => {
    setEmail('');
    setPassword('');
  }, []);

  if (!loading && isAuthenticated) {
    if (isAdmin) return <Navigate to="/admin" replace />;
    if (isClubMemberOnly) return <Navigate to={from} replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Email et mot de passe requis.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await login(email.trim(), password);
      if (isBureauRole(data.user.role)) {
        logout();
        setError('Compte bureau détecté. Utilisez la page de connexion admin.');
        return;
      }
      if (data.user.role !== 'member') {
        logout();
        setError('Identifiants incorrects.');
        return;
      }
      navigate(from);
    } catch (err) {
      if (!err.response) {
        setError(
          'Impossible de joindre le serveur. Vérifiez que le backend est démarré (port 5000).'
        );
        return;
      }
      setError(err.response?.data?.message || 'Connexion impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`page ${styles.page}`}>
      <div className="container" style={{ maxWidth: 440 }}>
        <div className={styles.header}>
          <img src="/logo.png" alt="ENISO Team" className={styles.logo} />
          <h1>Connexion membre</h1>
          <p>
            Connectez-vous avec le compte reçu après confirmation de votre paiement. Le site reste
            le même — formations, Coin RH et profil deviennent disponibles.
          </p>
        </div>
        <div className="card">
          {infoMessage && <div className="alert alert-success">{infoMessage}</div>}
          {error && (
            <div className="alert alert-error">
              {error}
              {error.includes('administrateur') && (
                <>
                  {' '}
                  <Link to="/admin/login" style={{ color: 'inherit', textDecoration: 'underline' }}>
                    Connexion admin
                  </Link>
                </>
              )}
            </div>
          )}
          <form className="form" onSubmit={onSubmit} autoComplete="off">
            <div className="form-group">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                name="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                readOnly
                onFocus={(e) => e.target.removeAttribute('readOnly')}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="login-password">Mot de passe</label>
              <input
                id="login-password"
                name="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                readOnly
                onFocus={(e) => e.target.removeAttribute('readOnly')}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%' }}>
              {submitting ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
