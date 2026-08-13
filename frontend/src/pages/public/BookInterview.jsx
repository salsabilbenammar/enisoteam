import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import styles from './BookInterview.module.css';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(value) {
  if (!value) return '—';
  return String(value).slice(0, 5);
}

function dateKey(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timeKey(value) {
  return String(value || '00:00').slice(0, 5);
}

function localToday() {
  return dateKey(new Date());
}

function localNowTime() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Masque créneaux complets et passés (date ou heure du jour). */
function isSlotSelectable(slot) {
  if (!slot) return false;
  if (Number(slot.places_restantes) <= 0) return false;
  const day = dateKey(slot.date_slot);
  const today = localToday();
  if (!day || day < today) return false;
  if (day === today && timeKey(slot.heure_slot) <= localNowTime()) return false;
  return true;
}

export default function BookInterview() {
  const { token: rawToken } = useParams();
  const token = decodeURIComponent(String(rawToken || ''))
    .trim()
    .replace(/[),.]+$/g, '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [candidate, setCandidate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selected, setSelected] = useState('');
  const [activeDay, setActiveDay] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () =>
    api
      .get(`/recruitment/book/${token}`)
      .then((res) => {
        setCandidate(res.data.candidate);
        const list = (res.data.slots || []).filter(isSlotSelectable);
        setSlots(list);
        setSelected((prev) => (list.some((s) => String(s.id) === String(prev)) ? prev : ''));
        if (list.length) {
          const firstDay = dateKey(list[0].date_slot);
          setActiveDay((prev) => (list.some((s) => dateKey(s.date_slot) === prev) ? prev : firstDay));
        } else {
          setActiveDay('');
        }
      })
      .catch((err) => setError(err.response?.data?.message || 'Lien invalide.'));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [token]);

  const days = useMemo(() => {
    const map = new Map();
    for (const s of slots) {
      const key = dateKey(s.date_slot);
      if (!map.has(key)) {
        map.set(key, { key, label: formatDate(s.date_slot), slots: [] });
      }
      map.get(key).slots.push(s);
    }
    return [...map.values()];
  }, [slots]);

  const daySlots = useMemo(() => {
    const day = days.find((d) => d.key === activeDay);
    return day?.slots || [];
  }, [days, activeDay]);

  const onBook = async (e) => {
    e.preventDefault();
    const chosen = slots.find((s) => String(s.id) === String(selected));
    if (!chosen || !isSlotSelectable(chosen)) {
      setError('Ce créneau n’est plus disponible. Choisissez un autre horaire.');
      setSelected('');
      await load();
      return;
    }
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const { data } = await api.post(`/recruitment/book/${token}`, { slot_id: Number(selected) });
      setSuccess(data.message);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Réservation impossible.');
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="page">
      <div className="container">
        <header className="page-header">
          <h1>Choisir un créneau</h1>
          {candidate && (
            <p>
              Bonjour {candidate.prenom} {candidate.nom} — sélectionnez une date puis une heure
              disponible.
            </p>
          )}
          <p className={styles.hint}>
            Ce lien sert uniquement à réserver votre entretien. L’accès à l’espace membre
            (projets, cotisations, Coin RH) sera disponible après paiement, avec les
            identifiants envoyés par email.
          </p>
        </header>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {candidate?.booked ? (
          <section className={`card ${styles.card}`}>
            <h2>Entretien déjà confirmé</h2>
            <p>
              Date : <strong>{formatDate(candidate.date_slot)}</strong>
              <br />
              Heure : <strong>{formatTime(candidate.heure_slot)}</strong>
              <br />
              Lieu : <strong>{candidate.lieu || '—'}</strong>
            </p>
            <p className={styles.hint}>Vous ne pouvez plus modifier votre choix.</p>
          </section>
        ) : (
          <section className={`card ${styles.card}`}>
            <h2>Calendrier des créneaux</h2>
            {days.length === 0 ? (
              <p className={styles.hint}>
                Aucun créneau disponible pour le moment (complets ou déjà passés).
              </p>
            ) : (
              <form className="form" onSubmit={onBook}>
                <div className={styles.calendar}>
                  <div className={styles.days} role="tablist" aria-label="Dates disponibles">
                    {days.map((day) => (
                      <button
                        key={day.key}
                        type="button"
                        role="tab"
                        aria-selected={activeDay === day.key}
                        className={`${styles.dayBtn} ${activeDay === day.key ? styles.dayActive : ''}`}
                        onClick={() => {
                          setActiveDay(day.key);
                          setSelected('');
                        }}
                      >
                        <span className={styles.dayLabel}>{day.label}</span>
                        <small>
                          {day.slots.length} horaire{day.slots.length > 1 ? 's' : ''}
                        </small>
                      </button>
                    ))}
                  </div>

                  <div className={styles.times} role="tabpanel">
                    <p className={styles.timesTitle}>
                      Horaires du {days.find((d) => d.key === activeDay)?.label || '—'}
                    </p>
                    <div className={styles.slots}>
                      {daySlots.map((s) => (
                        <label
                          key={s.id}
                          className={`${styles.slot} ${String(selected) === String(s.id) ? styles.active : ''}`}
                        >
                          <input
                            type="radio"
                            name="slot"
                            value={s.id}
                            checked={String(selected) === String(s.id)}
                            onChange={(e) => setSelected(e.target.value)}
                          />
                          <span>
                            <strong>{formatTime(s.heure_slot)}</strong>
                            <small>
                              {s.places_restantes} place{s.places_restantes > 1 ? 's' : ''} restante
                              {s.places_restantes > 1 ? 's' : ''}
                              {s.lieu ? ` · ${s.lieu}` : ''}
                            </small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={submitting || !selected}>
                  {submitting ? 'Confirmation…' : 'Confirmer mon créneau'}
                </button>
              </form>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
