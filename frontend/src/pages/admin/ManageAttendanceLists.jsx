import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { downloadAttendancePdf } from '../../utils/attendancePdf';
import { defaultDateMin } from '../../utils/dateLimits';
import styles from './ManageDeplacements.module.css';

const TYPES = [
  { value: 'reunion', label: 'Réunion' },
  { value: 'assemblee_generale', label: 'Assemblée générale' },
  { value: 'formation', label: 'Formation' },
];

const typeLabel = (type) => TYPES.find((t) => t.value === type)?.label || type;

const empty = {
  type: 'reunion',
  titre: '',
  date_seance: '',
  heure: '',
  lieu: '',
};

export default function ManageAttendanceLists() {
  const confirm = useConfirm();
  const [form, setForm] = useState(() => ({
    ...empty,
    date_seance: defaultDateMin(),
  }));
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState(null);
  const [entryForm, setEntryForm] = useState({ prenom: '', nom: '' });
  const [adding, setAdding] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const prenomRef = useRef(null);

  const load = () =>
    api
      .get('/attendance')
      .then((res) => setSessions(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        setError(
          err.response?.data?.message ||
            'Chargement impossible. Vérifiez la migration attendance.'
        );
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const openSession = async (id) => {
    setError('');
    try {
      const { data } = await api.get(`/attendance/${id}`);
      setActive(data);
      setEntryForm({ prenom: '', nom: '' });
      requestAnimationFrame(() => prenomRef.current?.focus());
    } catch (err) {
      setError(err.response?.data?.message || 'Chargement de la séance impossible.');
    }
  };

  const refreshActive = async (id) => {
    const { data } = await api.get(`/attendance/${id}`);
    setActive(data);
    setSessions((prev) =>
      prev.map((s) =>
        Number(s.id) === Number(id)
          ? { ...s, entries_count: data.entries?.length || 0, ouverte: data.ouverte }
          : s
      )
    );
    return data;
  };

  const onCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.titre.trim()) {
      setError('Indiquez un titre.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/attendance', {
        type: form.type,
        titre: form.titre.trim(),
        date_seance: form.date_seance || null,
        heure: form.heure || null,
        lieu: form.lieu.trim() || null,
      });
      setSuccess('Séance créée. Les membres peuvent saisir leur nom.');
      setForm({ ...empty, type: form.type, date_seance: defaultDateMin() });
      await load();
      await openSession(data.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Création impossible.');
    } finally {
      setSaving(false);
    }
  };

  const toggleOpen = async () => {
    if (!active) return;
    setError('');
    try {
      await api.put(`/attendance/${active.id}`, { ouverte: !active.ouverte });
      await refreshActive(active.id);
      setSuccess(active.ouverte ? 'Saisie fermée.' : 'Saisie rouverte.');
    } catch (err) {
      setError(err.response?.data?.message || 'Mise à jour impossible.');
    }
  };

  const onAddEntry = async (e) => {
    e.preventDefault();
    if (!active) return;
    const prenom = entryForm.prenom.trim();
    const nom = entryForm.nom.trim();
    if (!prenom || !nom) {
      setError('Prénom et nom requis.');
      return;
    }
    setAdding(true);
    setError('');
    try {
      await api.post(`/attendance/${active.id}/entries`, { prenom, nom });
      setEntryForm({ prenom: '', nom: '' });
      await refreshActive(active.id);
      prenomRef.current?.focus();
    } catch (err) {
      setError(err.response?.data?.message || 'Enregistrement impossible.');
    } finally {
      setAdding(false);
    }
  };

  const onDeleteEntry = async (entryId) => {
    if (!active) return;
    try {
      await api.delete(`/attendance/${active.id}/entries/${entryId}`);
      await refreshActive(active.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  const onDeleteSession = async (id) => {
    const ok = await confirm({
      title: 'Supprimer cette séance ?',
      message: 'La liste de présence enregistrée sera perdue.',
    });
    if (!ok) return;
    try {
      await api.delete(`/attendance/${id}`);
      if (Number(active?.id) === Number(id)) setActive(null);
      setSuccess('Séance supprimée.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  const onDownload = async () => {
    if (!active?.entries?.length) {
      setError('Aucun nom enregistré à télécharger.');
      return;
    }
    setDownloading(true);
    setError('');
    try {
      await downloadAttendancePdf({
        type: active.type,
        title: active.titre,
        date: active.date_seance ? String(active.date_seance).slice(0, 10) : '',
        time: active.heure || '',
        place: active.lieu || '',
        people: active.entries,
        filePrefix:
          active.type === 'assemblee_generale'
            ? 'liste_presence_ag'
            : active.type === 'formation'
              ? 'liste_presence_formation'
              : 'liste_presence_reunion',
      });
      setSuccess('Liste de présence PDF téléchargée.');
    } catch (err) {
      setError(err?.message || 'Téléchargement impossible.');
    } finally {
      setDownloading(false);
    }
  };

  const openKiosk = () => {
    if (!active?.public_token) return;
    window.open(`/presence/${active.public_token}`, '_blank', 'noopener,noreferrer');
  };

  const copyKioskLink = async () => {
    if (!active?.public_token) return;
    const url = `${window.location.origin}/presence/${active.public_token}`;
    try {
      await navigator.clipboard.writeText(url);
      setSuccess('Lien de saisie copié.');
    } catch {
      setError(`Lien : ${url}`);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <p className={styles.eyebrow}>Secrétariat</p>
        <h1>Listes de présence</h1>
        <p>
          Créez une séance, laissez chaque membre saisir son prénom et son nom sur l&apos;ordinateur,
          puis téléchargez la liste remplie.
        </p>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form className={styles.composer} onSubmit={onCreate}>
        <div className={styles.composerHead}>
          <div>
            <h2>Nouvelle séance</h2>
            <p>Réunion, assemblée générale ou formation — puis saisie sur place.</p>
          </div>
        </div>

        <div className={styles.gformCard}>
          <p className={styles.gformQuestion}>Type</p>
          <div className={styles.gformChoices}>
            {TYPES.map((t) => (
              <label key={t.value} className={styles.gformChoice}>
                <input
                  type="radio"
                  name="att-type"
                  checked={form.type === t.value}
                  onChange={() => setForm({ ...form, type: t.value })}
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.gformCard}>
          <label className={styles.gformQuestion} htmlFor="att-titre">
            Titre <span>*</span>
          </label>
          <input
            id="att-titre"
            value={form.titre}
            onChange={(e) => setForm({ ...form, titre: e.target.value })}
            placeholder="Ex. Réunion bureau — mars 2026"
            required
          />
        </div>

        <div className="form-row two">
          <div className={styles.gformCard}>
            <label className={styles.gformQuestion} htmlFor="att-date">
              Date
            </label>
            <input
              id="att-date"
              type="date"
              value={form.date_seance}
              onChange={(e) => setForm({ ...form, date_seance: e.target.value })}
            />
          </div>
          <div className={styles.gformCard}>
            <label className={styles.gformQuestion} htmlFor="att-heure">
              Heure
            </label>
            <input
              id="att-heure"
              type="time"
              value={form.heure}
              onChange={(e) => setForm({ ...form, heure: e.target.value })}
            />
          </div>
        </div>

        <div className={styles.gformCard}>
          <label className={styles.gformQuestion} htmlFor="att-lieu">
            Lieu
          </label>
          <input
            id="att-lieu"
            value={form.lieu}
            onChange={(e) => setForm({ ...form, lieu: e.target.value })}
            placeholder="Ex. Salle polyvalente ENISO"
          />
        </div>

        <div className={styles.gformActions}>
          <div className={styles.gformActionsRight}>
            <button type="submit" className={styles.gformSubmit} disabled={saving}>
              {saving ? 'Création…' : 'Créer et ouvrir la saisie'}
            </button>
          </div>
        </div>
      </form>

      {active && (
        <section className={styles.listPanel} aria-label="Saisie en cours">
          <div className={styles.listHead}>
            <div className={styles.listHeadRow}>
              <div>
                <h2>
                  {typeLabel(active.type)} — {active.titre}
                </h2>
                <p>
                  {active.ouverte ? 'Saisie ouverte' : 'Saisie fermée'}
                  {' · '}
                  {active.entries?.length || 0} présent
                  {(active.entries?.length || 0) > 1 ? 's' : ''}
                </p>
              </div>
              <div className={styles.listActions}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={openKiosk}>
                  Écran de saisie
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={copyKioskLink}>
                  Copier le lien
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={toggleOpen}>
                  {active.ouverte ? 'Fermer la saisie' : 'Rouvrir la saisie'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={onDownload}
                  disabled={downloading || !active.entries?.length}
                >
                  {downloading ? 'Export…' : 'Télécharger PDF'}
                </button>
              </div>
            </div>
          </div>

          {!!active.ouverte && (
            <form
              className={styles.composer}
              onSubmit={onAddEntry}
              style={{ marginTop: '1rem', marginBottom: '1rem' }}
            >
              <div className={styles.composerHead}>
                <div>
                  <h3 style={{ margin: 0 }}>Saisie sur place</h3>
                  <p>Chaque membre écrit son prénom et son nom, puis valide.</p>
                </div>
              </div>
              <div className="form-row two">
                <div className={styles.gformCard}>
                  <label className={styles.gformQuestion} htmlFor="entry-prenom">
                    Prénom <span>*</span>
                  </label>
                  <input
                    id="entry-prenom"
                    ref={prenomRef}
                    value={entryForm.prenom}
                    onChange={(e) => setEntryForm({ ...entryForm, prenom: e.target.value })}
                    autoComplete="given-name"
                    required
                  />
                </div>
                <div className={styles.gformCard}>
                  <label className={styles.gformQuestion} htmlFor="entry-nom">
                    Nom <span>*</span>
                  </label>
                  <input
                    id="entry-nom"
                    value={entryForm.nom}
                    onChange={(e) => setEntryForm({ ...entryForm, nom: e.target.value })}
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>
              <div className={styles.gformActions}>
                <div className={styles.gformActionsRight}>
                  <button type="submit" className={styles.gformSubmit} disabled={adding}>
                    {adding ? 'Enregistrement…' : 'Valider ma présence'}
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Prénom</th>
                  <th>Nom</th>
                  <th>Heure</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {!active.entries?.length ? (
                  <tr>
                    <td colSpan={5}>
                      <p className={styles.empty}>Aucun nom pour le moment.</p>
                    </td>
                  </tr>
                ) : (
                  active.entries.map((entry, idx) => (
                    <tr key={entry.id}>
                      <td>{idx + 1}</td>
                      <td>{entry.prenom}</td>
                      <td>
                        <strong>{entry.nom}</strong>
                      </td>
                      <td>
                        {entry.created_at
                          ? new Date(entry.created_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => onDeleteEntry(entry.id)}
                        >
                          Retirer
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className={styles.listPanel}>
        <div className={styles.listHead}>
          <h2>Séances</h2>
          <span className={`${styles.chip} ${styles.chipMuted}`}>
            {sessions.length} au total
          </span>
        </div>
        {!sessions.length ? (
          <p className={styles.empty}>Aucune séance pour le moment.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Titre</th>
                  <th>Date</th>
                  <th>Présents</th>
                  <th>Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>{typeLabel(s.type)}</td>
                    <td>
                      <strong>{s.titre}</strong>
                    </td>
                    <td>
                      {s.date_seance
                        ? new Date(s.date_seance).toLocaleDateString('fr-FR')
                        : '—'}
                    </td>
                    <td>{Number(s.entries_count || 0)}</td>
                    <td>
                      <span
                        className={`${styles.chip} ${
                          s.ouverte ? styles.chipOk : styles.chipClosed
                        }`}
                      >
                        {s.ouverte ? 'Ouverte' : 'Fermée'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.listActions}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => openSession(s.id)}
                        >
                          Ouvrir
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => onDeleteSession(s.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
