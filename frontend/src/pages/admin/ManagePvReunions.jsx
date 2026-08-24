import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { openUploadAsset } from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';
import { useAuth } from '../../context/AuthContext';

const empty = {
  titre: '',
  date_reunion: '',
  contenu: '',
  fichier: null,
  fichier_url: '',
};

export default function ManagePvReunions() {
  const { canEdit } = useAuth();
  const canEditPage = canEdit('pv_reunions');
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () =>
    api
      .get('/pv-reunions')
      .then((res) => setItems(res.data || []))
      .catch(() => setError('Chargement impossible.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setForm(empty);
    setEditId(null);
  };

  const onEdit = (item) => {
    setEditId(item.id);
    setForm({
      titre: item.titre || '',
      date_reunion: item.date_reunion ? String(item.date_reunion).slice(0, 10) : '',
      contenu: item.contenu || '',
      fichier: null,
      fichier_url: item.fichier || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.titre.trim() || !form.date_reunion) {
      setError('Titre et date de réunion sont requis.');
      return;
    }
    const data = new FormData();
    data.append('titre', form.titre.trim());
    data.append('date_reunion', form.date_reunion);
    data.append('contenu', form.contenu);
    if (form.fichier) data.append('fichier', form.fichier);

    setSaving(true);
    try {
      if (editId) await api.put(`/pv-reunions/${editId}`, data);
      else await api.post('/pv-reunions', data);
      setSuccess(editId ? 'PV mis à jour.' : 'PV enregistré.');
      reset();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    const ok = await confirm({
      title: 'Supprimer ce PV ?',
      message: 'Cette action est définitive.',
    });
    if (!ok) return;
    try {
      await api.delete(`/pv-reunions/${id}`);
      setSuccess('PV supprimé.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <header className="page-header">
        <h1>PV des réunions</h1>
        <p>
          Archivez les procès-verbaux des réunions du club.{' '}
          <Link to="/admin/listes-presence">Saisie de présence sur place</Link>
        </p>
      </header>

      <ReadOnlyBanner module="pv_reunions" />
      <fieldset disabled={!canEditPage} style={{ border: 0, padding: 0, margin: 0, minInlineSize: 0 }}>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form className="card form" onSubmit={onSubmit} style={{ marginBottom: '1.5rem' }}>
        <h3>{editId ? 'Modifier le PV' : 'Nouveau PV'}</h3>
        <div className="form-row two">
          <div className="form-group">
            <label htmlFor="pv-titre">Titre</label>
            <input
              id="pv-titre"
              value={form.titre}
              onChange={(e) => setForm({ ...form, titre: e.target.value })}
              placeholder="Ex. Réunion bureau — mars 2026"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="pv-date">Date de la réunion</label>
            <input
              id="pv-date"
              type="date"
              value={form.date_reunion}
              onChange={(e) => setForm({ ...form, date_reunion: e.target.value })}
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="pv-contenu">Compte rendu / notes</label>
          <textarea
            id="pv-contenu"
            rows={6}
            value={form.contenu}
            onChange={(e) => setForm({ ...form, contenu: e.target.value })}
            placeholder="Points abordés, décisions, actions…"
          />
        </div>
        <div className="form-group">
          <label htmlFor="pv-fichier">Fichier (PDF, Word…)</label>
          {form.fichier_url && !form.fichier && (
            <p style={{ marginBottom: '0.5rem' }}>
              Fichier actuel :{' '}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => openUploadAsset(form.fichier_url, 'pv.pdf')}
              >
                Voir le document
              </button>
            </p>
          )}
          <input
            id="pv-fichier"
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,application/pdf"
            onChange={(e) =>
              setForm({
                ...form,
                fichier: e.target.files?.[0] || null,
              })
            }
          />
          <small style={{ color: 'var(--text-muted)' }}>
            Optionnel. {editId ? 'Laissez vide pour conserver le fichier actuel.' : ''}
          </small>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enregistrement…' : editId ? 'Mettre à jour' : 'Enregistrer'}
          </button>
          {editId && (
            <button type="button" className="btn btn-secondary" onClick={reset}>
              Annuler
            </button>
          )}
        </div>
      </form>

      <div className="card">
        <h3>
          Liste des PV ({items.length})
        </h3>
        {!items.length ? (
          <p className="empty">Aucun PV enregistré pour le moment.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Titre</th>
                  <th>Document</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.date_reunion
                        ? new Date(item.date_reunion).toLocaleDateString('fr-FR')
                        : '—'}
                    </td>
                    <td>
                      <strong>{item.titre}</strong>
                      {item.contenu ? (
                        <div
                          style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.85rem',
                            marginTop: '0.25rem',
                            maxWidth: '28rem',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {String(item.contenu).length > 140
                            ? `${String(item.contenu).slice(0, 140)}…`
                            : item.contenu}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {item.fichier ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openUploadAsset(item.fichier, `${item.titre || 'pv'}.pdf`)}
                        >
                          Ouvrir
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onEdit(item)}
                        >
                          Éditer
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => onDelete(item.id)}
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
      </div>
    </fieldset>
    </div>
  );
}