import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import styles from './PresenceKiosk.module.css';

const TYPE_LABELS = {
  reunion: 'Réunion',
  assemblee_generale: 'Assemblée générale',
  formation: 'Formation',
};

export default function PresenceKiosk() {
  const { token } = useParams();
  const prenomRef = useRef(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [saving, setSaving] = useState(false);
  const [count, setCount] = useState(0);

  const load = () =>
    api
      .get(`/attendance/public/${token}`)
      .then((res) => {
        setSession(res.data);
        setCount(Number(res.data.entries_count || res.data.entries?.length || 0));
        setError('');
      })
      .catch((err) => {
        setSession(null);
        setError(err.response?.data?.message || 'Séance introuvable.');
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, [token]);

  useEffect(() => {
    if (session?.ouverte) {
      requestAnimationFrame(() => prenomRef.current?.focus());
    }
  }, [session?.ouverte, flash]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFlash('');
    const p = prenom.trim();
    const n = nom.trim();
    if (!p || !n) {
      setError('Écrivez votre prénom et votre nom.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post(`/attendance/public/${token}/entries`, {
        prenom: p,
        nom: n,
      });
      setFlash(data.message || `Merci ${p} ! Présence enregistrée.`);
      setPrenom('');
      setNom('');
      setCount((c) => c + 1);
      prenomRef.current?.focus();
    } catch (err) {
      setError(err.response?.data?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  if (!session) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1>Liste de présence</h1>
          <p className={styles.error}>{error || 'Séance introuvable.'}</p>
        </div>
      </div>
    );
  }

  const typeLabel = TYPE_LABELS[session.type] || 'Séance';
  const dateLabel = session.date_seance
    ? new Date(session.date_seance).toLocaleDateString('fr-FR')
    : null;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>ENISO Team · Liste de présence</p>
        <h1>{session.titre}</h1>
        <p className={styles.meta}>
          {typeLabel}
          {dateLabel ? ` · ${dateLabel}` : ''}
          {session.heure ? ` · ${session.heure}` : ''}
          {session.lieu ? ` · ${session.lieu}` : ''}
        </p>
        <p className={styles.count}>
          {count} présent{count > 1 ? 's' : ''} enregistré{count > 1 ? 's' : ''}
        </p>

        {!session.ouverte ? (
          <p className={styles.closed}>La saisie est fermée pour cette séance.</p>
        ) : (
          <form className={styles.form} onSubmit={onSubmit}>
            <p className={styles.hint}>Écrivez votre prénom et votre nom, puis validez.</p>
            {error && <p className={styles.error}>{error}</p>}
            {flash && <p className={styles.success}>{flash}</p>}
            <label htmlFor="kiosk-prenom">Prénom</label>
            <input
              id="kiosk-prenom"
              ref={prenomRef}
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              autoComplete="given-name"
              required
            />
            <label htmlFor="kiosk-nom">Nom</label>
            <input
              id="kiosk-nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              autoComplete="family-name"
              required
            />
            <button type="submit" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Valider ma présence'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
