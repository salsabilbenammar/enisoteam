import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from '../public/Login.module.css';

export default function AdminLogin() {
  const { login, logout, isAuthenticated, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from =
    location.state?.from?.startsWith('/admin') && location.state.from !== '/admin/login'
      ? location.state.from
      : '/admin';

  useEffect(() => {
    setEmail('');
    setPassword('');
  }, []);

  if (!loading && isAuthenticated) {
    if (isAdmin) return <Navigate to={from} replace />;
    return (
      <Navigate
        to="/"
        replace
        state={{ message: 'Accès réservé aux administrateurs.' }}
      />
    );
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
      if (data.user.role !== 'admin') {
        logout();
        setError('Compte membre détecté. Utilisez la page de connexion membre.');
        return;
      }
      navigate(from, { replace: true });
    } catch (err) {
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
          <h1>Administration</h1>
          <p>Connexion réservée aux administrateurs du club.</p>
        </div>
        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}
          <form className="form" onSubmit={onSubmit} autoComplete="off">
            <div className="form-group">
              <label htmlFor="admin-login-email">Email</label>
              <input
                id="admin-login-email"
                name="admin-login-email"
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
              <label htmlFor="admin-login-password">Mot de passe</label>
              <input
                id="admin-login-password"
                name="admin-login-password"
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
          <p style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Vous êtes membre ?{' '}
            <Link to="/login" style={{ color: 'var(--accent)' }}>
              Connexion membre
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
