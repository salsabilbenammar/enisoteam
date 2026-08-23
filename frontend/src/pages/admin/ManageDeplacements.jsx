import { useEffect, useMemo, useRef, useState } from 'react';
import api, { assetUrl } from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';
import { useAuth } from '../../context/AuthContext';
import { defaultDateMin, minSelectableDate } from '../../utils/dateLimits';
import styles from './ManageDeplacements.module.css';

const empty = {
  titre: '',
  description: '',
  destination: '',
  competition: '',
  date_competition: '',
  payant: false,
  prix: '',
  places_max: '',
  affiche: null,
  affiche_url: '',
};

function getAnswers(registration) {
  return registration?.reponses_personnalisees &&
    typeof registration.reponses_personnalisees === 'object'
    ? registration.reponses_personnalisees
    : {};
}

function getRobotName(registration) {
  const name = String(getAnswers(registration).comp_nom_robot || '').trim();
  return name || '—';
}

function splitCombinedName(value) {
  const parts = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { prenom: '', nom: '' };
  if (parts.length === 1) return { prenom: parts[0], nom: '' };
  return { prenom: parts[0], nom: parts.slice(1).join(' ') };
}

function getTeamMembers(registration) {
  const answers = getAnswers(registration);
  const members = [];
  const chefPrenom = String(registration.prenom || '').trim();
  const chefNom = String(registration.nom || '').trim();
  const chefFull = `${chefPrenom} ${chefNom}`.trim();
  if (chefFull) {
    members.push({
      key: 'chef',
      label: 'Chef',
      prenom: chefPrenom,
      nom: chefNom,
      fullName: chefFull,
    });
  }
  for (let i = 2; i <= 4; i += 1) {
    let prenom = String(answers[`membre_${i}_prenom`] || '').trim();
    let nom = String(answers[`membre_${i}_nom`] || '').trim();
    // Anciennes inscriptions : un seul champ « Nom et prénom »
    if (!prenom && nom.includes(' ')) {
      const split = splitCombinedName(nom);
      prenom = split.prenom;
      nom = split.nom;
    }
    const fullName = `${prenom} ${nom}`.trim();
    if (!fullName) continue;
    members.push({
      key: `membre_${i}`,
      label: `Membre ${i}`,
      prenom,
      nom,
      fullName,
    });
  }
  return members;
}

function getTeamMemberNames(registration) {
  return getTeamMembers(registration).map((m) => m.fullName);
}

export default function ManageDeplacements() {
  const { canEdit } = useAuth();
  const canEditPage = canEdit('deplacements');
  const confirm = useConfirm();
  const regsRef = useRef(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [dateMin, setDateMin] = useState(() => defaultDateMin());
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [regs, setRegs] = useState(null);
  const [regsTitle, setRegsTitle] = useState('');
  const [regsPaid, setRegsPaid] = useState(false);
  const [regsPrix, setRegsPrix] = useState('');
  const [regsId, setRegsId] = useState(null);
  const [regsLoading, setRegsLoading] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [paymentBusyId, setPaymentBusyId] = useState(null);
  const [selectedSpectatorIds, setSelectedSpectatorIds] = useState(() => new Set());
  const [savedListeFinaleAt, setSavedListeFinaleAt] = useState(null);
  const [savedListeCount, setSavedListeCount] = useState(0);
  const [savingListe, setSavingListe] = useState(false);

  const load = () =>
    api
      .get('/deplacements')
      .then((res) => setItems(res.data))
      .catch(() => setError('Chargement impossible.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setForm(empty);
    setEditId(null);
    setDateMin(defaultDateMin());
  };

  const onEdit = (item) => {
    setEditId(item.id);
    const date = item.date_competition ? String(item.date_competition).slice(0, 10) : '';
    setDateMin(date ? minSelectableDate(date) : defaultDateMin());
    setForm({
      titre: item.titre,
      description: item.description,
      destination: item.destination || '',
      competition: item.competition || '',
      date_competition: date,
      payant: !!item.payant,
      prix: item.prix || '',
      places_max: item.places_max != null ? String(item.places_max) : '',
      affiche: null,
      affiche_url: item.affiche_url || '',
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const data = new FormData();
      data.append('titre', form.titre);
      data.append('description', form.description);
      data.append('destination', form.destination || '');
      data.append('competition', form.competition || '');
      data.append('date_competition', form.date_competition || '');
      data.append('payant', form.payant ? '1' : '0');
      data.append('prix', form.prix || '');
      data.append('places_max', form.places_max || '');
      data.append('champs_personnalises', '[]');
      data.append('champs_competiteur', '[]');
      if (form.affiche) data.append('affiche', form.affiche);
      if (editId) await api.put(`/deplacements/${editId}`, data);
      else await api.post('/deplacements', data);
      reset();
      setSuccess(editId ? 'Formulaire car mis à jour.' : 'Formulaire car créé.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    const ok = await confirm({
      title: 'Supprimer ce formulaire car ?',
      message: 'Les inscriptions associées seront aussi supprimées.',
    });
    if (!ok) return;
    try {
      await api.delete(`/deplacements/${id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  const toggleInscription = async (item) => {
    setError('');
    setSuccess('');
    try {
      const { data } = await api.patch(`/deplacements/${item.id}/inscription`, {
        inscription_ouverte: !item.inscription_ouverte,
      });
      setItems((prev) => prev.map((x) => (x.id === item.id ? data : x)));
      setSuccess(
        data.inscription_ouverte
          ? `Inscriptions ouvertes pour « ${item.titre} ».`
          : `Inscriptions fermées pour « ${item.titre} ».`
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Mise à jour impossible.');
    }
  };

  const openRegs = async (item) => {
    setError('');
    setRegsLoading(true);
    setRegsTitle(item.titre);
    setRegsPaid(!!item.payant);
    setRegsPrix(item.payant && item.prix ? String(item.prix) : '');
    setRegsId(item.id);
    setPaymentFilter('all');
    const saved = item.liste_finale;
    const savedIds = Array.isArray(saved?.spectator_ids) ? saved.spectator_ids : [];
    setSelectedSpectatorIds(new Set(savedIds.map((id) => Number(id))));
    setSavedListeFinaleAt(item.liste_finale_at || null);
    setSavedListeCount(
      Array.isArray(saved?.personnes) ? saved.personnes.length : 0
    );
    try {
      const { data } = await api.get(`/deplacements/${item.id}/registrations`);
      setRegs(data);
      setItems((prev) =>
        prev.map((x) =>
          x.id === item.id ? { ...x, inscriptions_count: data.length } : x
        )
      );
      requestAnimationFrame(() => {
        regsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (err) {
      setRegs(null);
      setError(err.response?.data?.message || 'Chargement des candidats impossible.');
    } finally {
      setRegsLoading(false);
    }
  };

  const togglePayment = async (registration) => {
    if (!regsId || !regsPaid) return;
    setPaymentBusyId(registration.id);
    try {
      const { data } = await api.patch(
        `/deplacements/${regsId}/registrations/${registration.id}/paiement`,
        { paiement_valide: !registration.paiement_valide }
      );
      setRegs((prev) => (prev || []).map((r) => (r.id === data.id ? data : r)));
    } catch (err) {
      setError(err.response?.data?.message || 'Mise à jour du paiement impossible.');
    } finally {
      setPaymentBusyId(null);
    }
  };

  const paymentCounts = useMemo(() => {
    if (!regs || !regsPaid) return { valide: 0, non: 0 };
    let valide = 0;
    for (const r of regs) if (r.paiement_valide) valide += 1;
    return { valide, non: regs.length - valide };
  }, [regs, regsPaid]);

  const roleCounts = useMemo(() => {
    if (!regs) return { spectateur: 0, competiteur: 0 };
    let spectateur = 0;
    let competiteur = 0;
    for (const r of regs) {
      if (r.role_candidat === 'competiteur') competiteur += 1;
      else spectateur += 1;
    }
    return { spectateur, competiteur };
  }, [regs]);

  const competitorRegs = useMemo(() => {
    if (!regs) return [];
    let list = regs.filter((r) => r.role_candidat === 'competiteur');
    if (regsPaid && paymentFilter === 'valide') {
      list = list.filter((r) => !!r.paiement_valide);
    } else if (regsPaid && paymentFilter === 'non_valide') {
      list = list.filter((r) => !r.paiement_valide);
    }
    return list;
  }, [regs, regsPaid, paymentFilter]);

  const spectatorRegs = useMemo(() => {
    if (!regs) return [];
    let list = regs.filter((r) => r.role_candidat !== 'competiteur');
    if (regsPaid && paymentFilter === 'valide') {
      list = list.filter((r) => !!r.paiement_valide);
    } else if (regsPaid && paymentFilter === 'non_valide') {
      list = list.filter((r) => !r.paiement_valide);
    }
    return list;
  }, [regs, regsPaid, paymentFilter]);

  const toggleSpectator = (id) => {
    setSelectedSpectatorIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllSpectators = () => {
    setSelectedSpectatorIds(new Set(spectatorRegs.map((r) => r.id)));
  };

  const clearSpectatorSelection = () => {
    setSelectedSpectatorIds(new Set());
  };

  const finalTripList = useMemo(() => {
    const frais =
      regsPaid && regsPrix
        ? `${String(regsPrix).trim()}${/dt/i.test(String(regsPrix)) ? '' : ' DT'}`
        : '';
    const rows = [];
    for (const reg of competitorRegs) {
      const robot = getRobotName(reg);
      for (const member of getTeamMembers(reg)) {
        rows.push({
          id: `comp-${reg.id}-${member.key}`,
          fullName: member.fullName,
          prenom: member.prenom,
          nom: member.nom,
          type: 'Compétiteur',
          detail: member.label,
          robot: robot === '—' ? '' : robot,
          frais,
          paiement_valide: !!reg.paiement_valide,
        });
      }
    }
    for (const reg of spectatorRegs) {
      if (!selectedSpectatorIds.has(reg.id)) continue;
      rows.push({
        id: `spec-${reg.id}`,
        fullName: `${reg.prenom || ''} ${reg.nom || ''}`.trim(),
        prenom: String(reg.prenom || '').trim(),
        nom: String(reg.nom || '').trim(),
        type: 'Spectateur',
        detail: '',
        robot: '',
        frais,
        paiement_valide: !!reg.paiement_valide,
      });
    }
    return rows;
  }, [competitorRegs, spectatorRegs, selectedSpectatorIds, regsPaid, regsPrix]);

  const downloadFinalList = async () => {
    if (!finalTripList.length) return;
    setError('');
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const hasFrais = Boolean(regsPaid && regsPrix);
      doc.setFontSize(16);
      doc.text('ENISO Team — Liste finale de déplacement', 14, 18);
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(`Déplacement : ${regsTitle || '—'}`, 14, 28);
      doc.text(`Personnes : ${finalTripList.length}`, 14, 34);
      let metaY = 40;
      if (hasFrais) {
        doc.text(`Frais de trajet : ${regsPrix}${/dt/i.test(String(regsPrix)) ? '' : ' DT'} / personne`, 14, metaY);
        metaY += 6;
      }
      doc.setTextColor(0, 0, 0);

      const head = hasFrais
        ? [['#', 'Prénom', 'Nom', 'Frais de trajet']]
        : [['#', 'Prénom', 'Nom']];
      const body = finalTripList.map((row, idx) => {
        const base = [
          String(idx + 1),
          row.prenom || '—',
          row.nom || row.fullName || '—',
        ];
        if (hasFrais) {
          base.push(row.frais || '—');
        }
        return base;
      });

      autoTable(doc, {
        startY: metaY + 6,
        head,
        body,
        styles: { fontSize: 9, cellPadding: 2.2 },
        headStyles: { fillColor: [22, 57, 107], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 248, 252] },
        margin: { left: 14, right: 14 },
      });

      const stamp = new Date().toISOString().slice(0, 10);
      const safeTitle = String(regsTitle || 'deplacement')
        .replace(/[^\w\-]+/g, '_')
        .slice(0, 40);
      doc.save(`liste_finale_${safeTitle}_${stamp}.pdf`);
      setSuccess('PDF de la liste finale téléchargé.');
    } catch {
      setError('Téléchargement PDF impossible.');
    }
  };

  const saveFinalList = async () => {
    if (!regsId) return;
    if (!finalTripList.length) {
      setError('La liste finale est vide. Cochez des spectateurs ou attendez des compétiteurs.');
      return;
    }
    setError('');
    setSavingListe(true);
    try {
      const { data } = await api.put(`/deplacements/${regsId}/liste-finale`, {
        personnes: finalTripList,
        spectator_ids: [...selectedSpectatorIds],
      });
      setSavedListeFinaleAt(data.liste_finale_at || null);
      setSavedListeCount(
        Array.isArray(data.liste_finale?.personnes)
          ? data.liste_finale.personnes.length
          : finalTripList.length
      );
      setItems((prev) =>
        prev.map((x) =>
          x.id === regsId
            ? {
                ...x,
                liste_finale: data.liste_finale,
                liste_finale_at: data.liste_finale_at,
              }
            : x
        )
      );
      setSuccess(data.message || 'Liste finale enregistrée.');
    } catch (err) {
      setError(err.response?.data?.message || 'Enregistrement de la liste impossible.');
    } finally {
      setSavingListe(false);
    }
  };

  const overview = useMemo(() => {
    const open = items.filter((i) => i.inscription_ouverte).length;
    const candidates = items.reduce((sum, i) => sum + Number(i.inscriptions_count || 0), 0);
    return { total: items.length, open, candidates };
  }, [items]);

  if (loading) return <Loader />;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <p className={styles.eyebrow}>Secrétariat</p>
        <h1>Car &amp; compétitions</h1>
        <p>
          Créez les formulaires de car pour les compétitions externes, ouvrez les
          inscriptions et suivez les candidats spectateurs ou compétiteurs.
        </p>
      </header>

      <ReadOnlyBanner module="deplacements" />
      <fieldset disabled={!canEditPage} style={{ border: 0, padding: 0, margin: 0, minInlineSize: 0 }}>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span>Formulaires</span>
          <strong>{overview.total}</strong>
        </div>
        <div className={styles.stat}>
          <span>Inscriptions ouvertes</span>
          <strong>{overview.open}</strong>
        </div>
        <div className={styles.stat}>
          <span>Candidats au total</span>
          <strong>{overview.candidates}</strong>
        </div>
      </div>

      <form className={styles.composer} onSubmit={onSubmit}>
        <div className={styles.gformBanner}>
          <p className={styles.gformBannerEyebrow}>ENISO Team · Admin</p>
          <h2>{editId ? 'Modifier le formulaire car' : 'Nouveau formulaire car'}</h2>
          <p>
            {editId
              ? 'Mettez à jour les informations de la compétition et du trajet.'
              : 'Créez un formulaire fixe pour une compétition externe.'}
          </p>
          {editId && <span className={styles.editBadge}>Mode édition</span>}
        </div>

        <div className={styles.gformCard}>
          <label htmlFor="dep-titre">
            Titre du formulaire <span>*</span>
          </label>
          <input
            id="dep-titre"
            value={form.titre}
            onChange={(e) => setForm({ ...form, titre: e.target.value })}
            required
            placeholder="Réponse courte"
          />
        </div>

        <div className={styles.gformCard}>
          <label htmlFor="dep-competition">Compétition externe</label>
          <input
            id="dep-competition"
            value={form.competition}
            onChange={(e) => setForm({ ...form, competition: e.target.value })}
            placeholder="Réponse courte"
          />
        </div>

        <div className={styles.gformCard}>
          <label htmlFor="dep-affiche">Affiche de la compétition</label>
          {(form.affiche || form.affiche_url) && (
            <img
              src={
                form.affiche
                  ? URL.createObjectURL(form.affiche)
                  : assetUrl(form.affiche_url)
              }
              alt="Aperçu affiche"
              className={styles.affichePreview}
            />
          )}
          <input
            id="dep-affiche"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) =>
              setForm({
                ...form,
                affiche: e.target.files?.[0] || null,
              })
            }
          />
          <p className={styles.afficheHint}>
            JPG, PNG ou WebP. {editId ? 'Laissez vide pour conserver l’affiche actuelle.' : ''}
          </p>
        </div>

        <div className={styles.gformCard}>
          <label htmlFor="dep-destination">Destination / lieu</label>
          <input
            id="dep-destination"
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            placeholder="Réponse courte"
          />
        </div>

        <div className={styles.gformCard}>
          <label htmlFor="dep-description">
            Description <span>*</span>
          </label>
          <textarea
            id="dep-description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
            placeholder="Réponse longue"
            rows={4}
          />
        </div>

        <div className={styles.gformCard}>
          <label htmlFor="dep-date">Date de compétition</label>
          <input
            id="dep-date"
            type="date"
            value={form.date_competition}
            min={dateMin}
            onChange={(e) => setForm({ ...form, date_competition: e.target.value })}
          />
        </div>

        <div className={styles.gformCard}>
          <label htmlFor="dep-places">Places max (optionnel)</label>
          <input
            id="dep-places"
            type="number"
            min="1"
            value={form.places_max}
            onChange={(e) => setForm({ ...form, places_max: e.target.value })}
            placeholder="Réponse courte"
          />
        </div>

        <div className={styles.gformCard}>
          <p className={styles.gformQuestion}>Trajet payant ?</p>
          <div className={styles.gformChoices}>
            <label className={styles.gformChoice}>
              <input
                type="radio"
                name="dep-payant"
                checked={form.payant === true}
                onChange={() => setForm({ ...form, payant: true })}
              />
              Oui
            </label>
            <label className={styles.gformChoice}>
              <input
                type="radio"
                name="dep-payant"
                checked={form.payant === false}
                onChange={() => setForm({ ...form, payant: false, prix: '' })}
              />
              Non
            </label>
          </div>
        </div>

        {form.payant && (
          <div className={styles.gformCard}>
            <label htmlFor="dep-prix">
              Montant <span>*</span>
            </label>
            <input
              id="dep-prix"
              value={form.prix}
              onChange={(e) => setForm({ ...form, prix: e.target.value })}
              required
              placeholder="Réponse courte"
            />
          </div>
        )}

        <div className={styles.gformSection}>
          <h3>Formulaire spécialisé</h3>
          <p>
            Le formulaire membre contient automatiquement le rôle (compétiteur ou
            spectateur), les coordonnées du chef d’équipe et les informations des
            membres 2, 3 et 4. Aucune question personnalisée n’est nécessaire.
          </p>
        </div>

        <div className={styles.gformActions}>
          {editId && (
            <button type="button" className={styles.gformClear} onClick={reset}>
              Annuler
            </button>
          )}
          <button type="submit" className={styles.gformSubmit} disabled={saving}>
            {saving ? 'Enregistrement…' : editId ? 'Mettre à jour' : 'Créer le formulaire'}
          </button>
        </div>
      </form>

      <section className={styles.listPanel}>
        <div className={styles.listHead}>
          <h2>Formulaires publiés</h2>
          <span className={`${styles.chip} ${styles.chipMuted}`}>{items.length} au total</span>
        </div>
        {!items.length ? (
          <p className={styles.empty}>Aucun formulaire car pour le moment.</p>
        ) : (
          <div className={styles.tripGrid}>
            {items.map((item) => (
              <article key={item.id} className={styles.tripCard}>
                <div className={styles.tripTop}>
                  {item.affiche_url && (
                    <img
                      src={assetUrl(item.affiche_url)}
                      alt={`Affiche ${item.competition || item.titre}`}
                      className={styles.tripAffiche}
                    />
                  )}
                  <div>
                    <div className={styles.tripMeta}>
                      {item.competition && (
                        <span className={styles.chip}>{item.competition}</span>
                      )}
                      {item.destination && (
                        <span className={`${styles.chip} ${styles.chipMuted}`}>
                          {item.destination}
                        </span>
                      )}
                      <span
                        className={`${styles.chip} ${
                          item.inscription_ouverte ? styles.chipOk : styles.chipClosed
                        }`}
                      >
                        {item.inscription_ouverte ? 'Ouvert' : 'Fermé'}
                      </span>
                    </div>
                    <h3>{item.titre}</h3>
                    <p>{item.description}</p>
                  </div>
                </div>
                <div className={styles.tripFacts}>
                  <span>
                    Date{' '}
                    <strong>
                      {item.date_competition
                        ? new Date(item.date_competition).toLocaleDateString('fr-FR')
                        : '—'}
                    </strong>
                  </span>
                  <span>
                    Prix <strong>{item.payant ? item.prix || 'Payant' : 'Gratuit'}</strong>
                  </span>
                  <span>
                    Candidats{' '}
                    <strong>
                      {Number(item.inscriptions_count || 0)}
                      {item.places_max != null ? ` / ${item.places_max}` : ''}
                    </strong>
                  </span>
                </div>
                <div className={styles.tripActions}>
                  <button
                    type="button"
                    className={`btn btn-sm ${
                      item.inscription_ouverte ? 'btn-primary' : 'btn-secondary'
                    }`}
                    onClick={() => toggleInscription(item)}
                  >
                    {item.inscription_ouverte ? 'Fermer inscriptions' : 'Ouvrir inscriptions'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => openRegs(item)}
                    disabled={regsLoading}
                  >
                    Candidats ({Number(item.inscriptions_count || 0)})
                  </button>
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
              </article>
            ))}
          </div>
        )}
      </section>

      {(regs || regsLoading) && (
        <section className={styles.regsPanel} ref={regsRef}>
          <div className={styles.regsHead}>
            <div>
              <h2>Candidats — {regsTitle}</h2>
              <p>
                {regsLoading
                  ? 'Chargement…'
                  : `${regs.length} inscription${regs.length > 1 ? 's' : ''} · ${
                      roleCounts.competiteur
                    } compétiteur${roleCounts.competiteur > 1 ? 's' : ''} · ${
                      roleCounts.spectateur
                    } spectateur${roleCounts.spectateur > 1 ? 's' : ''}`}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setRegs(null);
                setRegsTitle('');
                setRegsId(null);
                setRegsPrix('');
                setSelectedSpectatorIds(new Set());
                setSavedListeFinaleAt(null);
                setSavedListeCount(0);
              }}
            >
              Fermer
            </button>
          </div>

          {regsLoading ? (
            <p className={styles.empty}>Chargement…</p>
          ) : !regs.length ? (
            <p className={styles.empty}>Aucun candidat inscrit pour le moment.</p>
          ) : (
            <>
              {regsPaid && (
                <div className={styles.filters}>
                  <div className={styles.field}>
                    <label htmlFor="filter-pay">Filtrer par paiement</label>
                    <select
                      id="filter-pay"
                      value={paymentFilter}
                      onChange={(e) => setPaymentFilter(e.target.value)}
                    >
                      <option value="all">Tous ({regs.length})</option>
                      <option value="valide">
                        Paiement validé ({paymentCounts.valide})
                      </option>
                      <option value="non_valide">
                        Paiement non validé ({paymentCounts.non})
                      </option>
                    </select>
                  </div>
                </div>
              )}

              <div className={styles.listBlock}>
                <div className={styles.listHead}>
                  <h3>Compétiteurs ({roleCounts.competiteur})</h3>
                  <p>Nom du robot et membres de chaque groupe.</p>
                </div>
                {competitorRegs.length ? (
                  <div className={styles.tableWrap}>
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Robot</th>
                          <th>Membres du groupe</th>
                          <th>Email (chef)</th>
                          <th>Téléphone</th>
                          <th>Filière</th>
                          {regsPaid && <th>Paiement</th>}
                          <th>Inscription</th>
                          {regsPaid && <th>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {competitorRegs.map((r, idx) => {
                          const members = getTeamMemberNames(r);
                          return (
                            <tr key={r.id}>
                              <td>{idx + 1}</td>
                              <td>
                                <strong>{getRobotName(r)}</strong>
                              </td>
                              <td>
                                <ul className={styles.memberList}>
                                  {members.map((name, memberIdx) => (
                                    <li key={`${r.id}-m-${memberIdx}`}>
                                      {memberIdx === 0 ? (
                                        <>
                                          <span className={styles.memberRole}>Chef</span>{' '}
                                          {name}
                                        </>
                                      ) : (
                                        <>
                                          <span className={styles.memberRole}>
                                            Membre {memberIdx + 1}
                                          </span>{' '}
                                          {name}
                                        </>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </td>
                              <td>{r.email}</td>
                              <td>{r.telephone}</td>
                              <td>{r.filiere || '—'}</td>
                              {regsPaid && (
                                <td>
                                  <span
                                    className={`${styles.chip} ${
                                      r.paiement_valide ? styles.chipOk : styles.chipClosed
                                    }`}
                                  >
                                    {r.paiement_valide ? 'Validé' : 'Non validé'}
                                  </span>
                                </td>
                              )}
                              <td>{new Date(r.created_at).toLocaleString('fr-FR')}</td>
                              {regsPaid && (
                                <td>
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${
                                      r.paiement_valide ? 'btn-secondary' : 'btn-primary'
                                    }`}
                                    disabled={paymentBusyId === r.id}
                                    onClick={() => togglePayment(r)}
                                  >
                                    {paymentBusyId === r.id
                                      ? '…'
                                      : r.paiement_valide
                                        ? 'Annuler'
                                        : 'Valider'}
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className={styles.empty}>Aucun compétiteur inscrit.</p>
                )}
              </div>

              <div className={styles.listBlock}>
                <div className={styles.listHead}>
                  <div className={styles.listHeadRow}>
                    <div>
                      <h3>Spectateurs ({roleCounts.spectateur})</h3>
                      <p>Cochez les spectateurs à inclure dans la liste finale.</p>
                    </div>
                    {spectatorRegs.length > 0 && (
                      <div className={styles.listActions}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={selectAllSpectators}
                        >
                          Tout cocher
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={clearSpectatorSelection}
                        >
                          Tout décocher
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {spectatorRegs.length ? (
                  <div className={styles.tableWrap}>
                    <table>
                      <thead>
                        <tr>
                          <th className={styles.checkCol}>Inclure</th>
                          <th>#</th>
                          <th>Prénom</th>
                          <th>Nom</th>
                          <th>Email</th>
                          <th>Téléphone</th>
                          <th>Filière</th>
                          {regsPaid && <th>Paiement</th>}
                          <th>Inscription</th>
                          {regsPaid && <th>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {spectatorRegs.map((r, idx) => (
                          <tr key={r.id}>
                            <td className={styles.checkCol}>
                              <input
                                type="checkbox"
                                checked={selectedSpectatorIds.has(r.id)}
                                onChange={() => toggleSpectator(r.id)}
                                aria-label={`Inclure ${r.prenom} ${r.nom}`}
                              />
                            </td>
                            <td>{idx + 1}</td>
                            <td>{r.prenom}</td>
                            <td>{r.nom}</td>
                            <td>{r.email}</td>
                            <td>{r.telephone}</td>
                            <td>{r.filiere || '—'}</td>
                            {regsPaid && (
                              <td>
                                <span
                                  className={`${styles.chip} ${
                                    r.paiement_valide ? styles.chipOk : styles.chipClosed
                                  }`}
                                >
                                  {r.paiement_valide ? 'Validé' : 'Non validé'}
                                </span>
                              </td>
                            )}
                            <td>{new Date(r.created_at).toLocaleString('fr-FR')}</td>
                            {regsPaid && (
                              <td>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${
                                    r.paiement_valide ? 'btn-secondary' : 'btn-primary'
                                  }`}
                                  disabled={paymentBusyId === r.id}
                                  onClick={() => togglePayment(r)}
                                >
                                  {paymentBusyId === r.id
                                    ? '…'
                                    : r.paiement_valide
                                      ? 'Annuler'
                                      : 'Valider'}
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className={styles.empty}>Aucun spectateur inscrit.</p>
                )}
              </div>

              <div className={styles.listBlock}>
                <div className={styles.listHead}>
                  <div className={styles.listHeadRow}>
                    <div>
                      <h3>Liste finale de déplacement ({finalTripList.length})</h3>
                      <p>
                        Tous les membres des équipes compétiteurs + les spectateurs
                        cochés.
                        {savedListeFinaleAt
                          ? ` Dernière sauvegarde : ${new Date(
                              savedListeFinaleAt
                            ).toLocaleString('fr-FR')} (${savedListeCount} personne${
                              savedListeCount > 1 ? 's' : ''
                            }).`
                          : ''}
                      </p>
                    </div>
                    <div className={styles.listActions}>
                      {finalTripList.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={downloadFinalList}
                        >
                          Télécharger PDF
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={saveFinalList}
                        disabled={savingListe || !finalTripList.length}
                      >
                        {savingListe ? 'Enregistrement…' : 'Enregistrer la liste'}
                      </button>
                    </div>
                  </div>
                </div>
                {finalTripList.length ? (
                  <div className={styles.tableWrap}>
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Prénom</th>
                          <th>Nom</th>
                          {regsPaid && regsPrix ? <th>Frais de trajet</th> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {finalTripList.map((row, idx) => (
                          <tr key={row.id}>
                            <td>{idx + 1}</td>
                            <td>{row.prenom || '—'}</td>
                            <td>
                              <strong>{row.nom || row.fullName}</strong>
                            </td>
                            {regsPaid && regsPrix ? (
                              <td>{row.frais || '—'}</td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className={styles.empty}>
                    Aucune personne dans la liste finale. Les membres compétiteurs
                    apparaissent automatiquement ; cochez des spectateurs pour les
                    ajouter.
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </fieldset>
    </div>
  );
}