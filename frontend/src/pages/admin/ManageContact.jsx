import { useEffect, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';

const empty = {
  contact_label: '',
  contact_phone: '',
  instagram_url: '',
  facebook_url: '',
  linkedin_url: '',
};

export default function ManageContact() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api
      .get('/site-settings')
      .then((res) =>
        setForm({
          contact_label: res.data.contact_label || '',
          contact_phone: res.data.contact_phone || '',
          instagram_url: res.data.instagram_url || '',
          facebook_url: res.data.facebook_url || '',
          linkedin_url: res.data.linkedin_url || '',
        })
      )
      .catch(() => setError('Impossible de charger les paramètres.'))
      .finally(() => setLoading(false));
  }, []);

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const { data } = await api.put('/site-settings', form);
      setForm({
        contact_label: data.contact_label || '',
        contact_phone: data.contact_phone || '',
        instagram_url: data.instagram_url || '',
        facebook_url: data.facebook_url || '',
        linkedin_url: data.linkedin_url || '',
      });
      setSuccess('Contact et liens mis à jour. Le footer du site public est actualisé.');
    } catch (err) {
      setError(err.response?.data?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <header className="page-header">
        <h1>Contact & réseaux</h1>
        <p>Modifiez le numéro affiché dans le footer et les liens Instagram, Facebook et LinkedIn.</p>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form className="card form" onSubmit={onSubmit}>
        <h3>Contact</h3>
        <div className="form-group">
          <label htmlFor="contact_label">Libellé</label>
          <input
            id="contact_label"
            name="contact_label"
            value={form.contact_label}
            onChange={onChange}
            placeholder="Ressources humaines et formations"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="contact_phone">Téléphone</label>
          <input
            id="contact_phone"
            name="contact_phone"
            value={form.contact_phone}
            onChange={onChange}
            placeholder="96295048"
            required
          />
        </div>

        <h3 style={{ marginTop: '1.25rem' }}>Liens réseaux sociaux</h3>
        <div className="form-group">
          <label htmlFor="instagram_url">Instagram</label>
          <input
            id="instagram_url"
            name="instagram_url"
            type="url"
            value={form.instagram_url}
            onChange={onChange}
            placeholder="https://www.instagram.com/..."
          />
        </div>
        <div className="form-group">
          <label htmlFor="facebook_url">Facebook</label>
          <input
            id="facebook_url"
            name="facebook_url"
            type="url"
            value={form.facebook_url}
            onChange={onChange}
            placeholder="https://www.facebook.com/..."
          />
        </div>
        <div className="form-group">
          <label htmlFor="linkedin_url">LinkedIn</label>
          <input
            id="linkedin_url"
            name="linkedin_url"
            type="url"
            value={form.linkedin_url}
            onChange={onChange}
            placeholder="https://www.linkedin.com/..."
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </div>
  );
}
