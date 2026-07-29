import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Login.module.css';

export default function Login() {
  const { login, isAuthenticated, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const infoMessage = location.state?.message || '';
  const from = location.state?.from || '';

  useEffect(() => {
    setEmail('');
    setPassword('');
  }, []);

  if (!loading && isAuthenticated) {
    if (isAdmin) return <Navigate to="/admin" replace />;
    if (from === '/trainings' || from === '/rh' || from === '/recruitment') {
      return <Navigate to={from === '/recruitment' ? '/rh' : from} replace />;
    }
    return <Navigate to="/trainings" replace />;
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
      if (data.user.role === 'admin') {
        navigate('/admin');
      } else if (from === '/trainings' || from === '/rh' || from === '/recruitment') {
        navigate(from === '/recruitment' ? '/rh' : from);
      } else {
        navigate('/trainings');
      }
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
          <h1>Connexion</h1>
          <p>Membres du club et administrateurs. Une seule connexion suffit : votre accès reste enregistré sur cet appareil.</p>
        </div>
        <div className="card">
          {infoMessage && <div className="alert alert-success">{infoMessage}</div>}
          {error && <div className="alert alert-error">{error}</div>}
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
