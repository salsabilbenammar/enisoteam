import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';
import styles from './Login.module.css';

export default function MemberProfile() {
  const { user, refreshProfile } = useAuth();
  const [nom, setNom] = useState('');
  const [filiere, setFiliere] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setNom(user.nom || '');
      setFiliere(user.filiere || '');
    }
  }, [user]);

  if (!user) return <Loader />;

  const onSaveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSavingProfile(true);
    try {
      const { data } = await api.put('/auth/me', { nom, filiere });
      if (refreshProfile) await refreshProfile(data);
      setSuccess(data.message || 'Profil mis à jour.');
    } catch (err) {
      setError(err.response?.data?.message || 'Mise à jour du profil impossible.');
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('La confirmation du mot de passe ne correspond pas.');
      return;
    }
    setSavingPassword(true);
    try {
      const { data } = await api.put('/auth/me/password', {
        currentPassword,
        newPassword,
      });
      setSuccess(data.message || 'Mot de passe mis à jour.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Changement de mot de passe impossible.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className={`page ${styles.page}`}>
      <div className="container" style={{ maxWidth: 560 }}>
        <div className={styles.header}>
          <h1>Mon profil</h1>
          <p>Gérez vos informations et votre mot de passe. Le site public reste le même.</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ marginTop: 0 }}>Informations</h3>
          <form className="form" onSubmit={onSaveProfile}>
            <div className="form-group">
              <label htmlFor="profile-email">Email</label>
              <input id="profile-email" value={user.email || ''} disabled />
            </div>
            <div className="form-group">
              <label htmlFor="profile-nom">Nom</label>
              <input
                id="profile-nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="profile-filiere">Filière</label>
              <input
                id="profile-filiere"
                value={filiere}
                onChange={(e) => setFiliere(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
              {savingProfile ? 'Enregistrement…' : 'Enregistrer le profil'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Mot de passe</h3>
          <form className="form" onSubmit={onChangePassword}>
            <div className="form-group">
              <label htmlFor="pwd-current">Mot de passe actuel</label>
              <input
                id="pwd-current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="pwd-new">Nouveau mot de passe</label>
              <input
                id="pwd-new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="pwd-confirm">Confirmer</label>
              <input
                id="pwd-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingPassword}>
              {savingPassword ? 'Mise à jour…' : 'Changer le mot de passe'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
