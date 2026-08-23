import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import api, { assetUrl } from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';
import { useAuth } from '../../context/AuthContext';
import GoogleFormBuilder, { createBlankQuestion } from '../../components/admin/GoogleFormBuilder';
import { toApiFields } from '../../data/formQuestionBank';
import { defaultDateTimeMin, minSelectableDateTime } from '../../utils/dateLimits';
import styles from './ManageDeplacements.module.css';

const empty = {
  titre: '',
  description: '',
  date: '',
  lieu: '',
  image: null,
  image_url: '',
  payant: false,
  prix: '',
  audience: 'public',
  formulaire_type: 'les_deux',
  accompagnants_min: 1,
  accompagnants_max: 3,
  champs_chef: [],
  champs_membres: [],
  champs_communs: [],
};

const DEFAULT_SELECTION_MAIL_SUBJECT = 'Sélection — [Evenement]';
const DEFAULT_SELECTION_MAIL_BODY = `Bonjour [Nom],

Nous avons le plaisir de vous informer que votre inscription à « [Evenement] » a été retenue.

Date : [Date]
Lieu : [Lieu]
Type d'inscription : [Type]

Cordialement,
ENISO Team`;

function mapAdminFields(list) {
  return (list || []).map((f) => ({
    id: f.id,
    label: f.label,
    type: f.type || 'text',
    required: !!f.required,
    options: Array.isArray(f.options)
      ? f.options
      : String(f.options || '')
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean),
  }));
}

function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formTypeLabel(type) {
  if (type === 'groupe') return 'Groupe seulement';
  if (type === 'les_deux' || type === 'avec_accompagnants') return 'Personne et groupe';
  return 'Personne seulement';
}

function fromApiFormType(type) {
  if (type === 'groupe') return 'groupe';
  if (type === 'les_deux' || type === 'avec_accompagnants') return 'les_deux';
  return 'personne';
}

const SKIP_ANSWER_KEYS = new Set(['mode_inscription']);

function parseAnswers(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}

function formatValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value === true) return 'Oui';
  if (value === false || value === '') return 'Non';
  return String(value ?? '—');
}

function answerEntries(answers, fields, { skipIds = SKIP_ANSWER_KEYS } = {}) {
  const parsed = parseAnswers(answers);
  if (!Object.keys(parsed).length) return [];
  const fieldMap = new Map((fields || []).map((f) => [f.id, f]));
  const seen = new Set();
  const rows = [];

  for (const field of fields || []) {
    if (skipIds.has(field.id)) continue;
    const value = parsed[field.id];
    if (value === undefined || value === null || value === '') continue;
    rows.push({ id: field.id, label: field.label || field.id, value: formatValue(value) });
    seen.add(field.id);
  }

  for (const [id, value] of Object.entries(parsed)) {
    if (skipIds.has(id) || seen.has(id)) continue;
    if (value === undefined || value === null || value === '') continue;
    rows.push({ id, label: fieldMap.get(id)?.label || id, value: formatValue(value) });
  }

  return rows;
}

function leaderAnswerRows(reg, meta) {
  const answers = parseAnswers(reg?.reponses_personnalisees);
  const fromChef = answerEntries(answers, meta.chefFields);
  if (fromChef.length) return fromChef;
  return answerEntries(answers, meta.fields);
}

function formatCompanions(list) {
  if (!Array.isArray(list) || !list.length) return '—';
  return list
    .map((c) => `${c.prenom || ''} ${c.nom || ''}`.trim())
    .filter(Boolean)
    .join(', ');
}

function registrationHasDetails(reg, meta) {
  if (leaderAnswerRows(reg, meta).length > 0) return true;
  return (reg.accompagnants || []).some((c) =>
    answerEntries(c.reponses, meta.memberFields).length > 0
  );
}

function buildFinalRow(reg) {
  const answers = parseAnswers(reg.reponses_personnalisees);
  const isGroup = answers.mode_inscription === 'groupe';
  const groupMembers = formatCompanions(reg.accompagnants);
  return {
    id: reg.id,
    fullName: `${reg.prenom || ''} ${reg.nom || ''}`.trim(),
    prenom: reg.prenom || '',
    nom: reg.nom || '',
    email: reg.email || '',
    telephone: reg.telephone || '',
    filiere: reg.filiere || '',
    type: isGroup ? 'Groupe' : 'Personne',
    groupMembers: groupMembers === '—' ? '' : groupMembers,
    groupSize: 1 + (Array.isArray(reg.accompagnants) ? reg.accompagnants.length : 0),
  };
}

function paymentStatusLabel(reg, eventPaid) {
  if (!eventPaid) return '—';
  if (reg.paiement_valide) return 'Validé';
  if (reg.accepte_paiement) return 'En attente';
  return 'Refusé';
}

function getCustomAnswer(reg, fieldId, meta, companion = null) {
  if (!fieldId) return '';
  const answers = parseAnswers(companion ? companion.reponses : reg.reponses_personnalisees);
  const val = answers[fieldId];
  if (val === undefined || val === null || val === '') return '';
  return formatValue(val);
}

function getFieldLabel(meta, fieldId) {
  return (meta.fields || []).find((f) => f.id === fieldId)?.label || fieldId;
}

function buildExportRows(sourceRegs, layout, meta, { eventPaid, eventPrix }) {
  const frais =
    eventPaid && eventPrix
      ? `${String(eventPrix).trim()}${/dt/i.test(String(eventPrix)) ? '' : ' DT'}`
      : '';

  if (layout === '__membres__') {
    const rows = [];
    for (const reg of sourceRegs) {
      const chefName = `${reg.prenom || ''} ${reg.nom || ''}`.trim();
      rows.push({
        regId: reg.id,
        sortKey: chefName,
        role: 'Chef',
        prenom: reg.prenom || '',
        nom: reg.nom || '',
        email: reg.email || '—',
        telephone: reg.telephone || '—',
        filiere: reg.filiere || '—',
        equipe: chefName,
        paiement: paymentStatusLabel(reg, eventPaid),
        frais,
        detail: leaderAnswerRows(reg, meta)
          .map((r) => `${r.label}: ${r.value}`)
          .join(' · '),
        createdAt: reg.created_at,
        reg,
      });
      for (const c of reg.accompagnants || []) {
        const name = `${c.prenom || ''} ${c.nom || ''}`.trim();
        rows.push({
          regId: reg.id,
          sortKey: `${chefName} ${name}`,
          role: 'Membre',
          prenom: c.prenom || '',
          nom: c.nom || '',
          email: '—',
          telephone: '—',
          filiere: '—',
          equipe: chefName,
          paiement: paymentStatusLabel(reg, eventPaid),
          frais,
          detail: answerEntries(c.reponses, meta.memberFields)
            .map((r) => `${r.label}: ${r.value}`)
            .join(' · '),
          createdAt: reg.created_at,
          reg,
        });
      }
    }
    rows.sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey), 'fr'));
    return rows;
  }

  const rows = sourceRegs.map((reg) => {
    const answers = parseAnswers(reg.reponses_personnalisees);
    const isGroup = answers.mode_inscription === 'groupe';
    const groupField =
      layout !== '__chefs__' ? getCustomAnswer(reg, layout, meta) : '';
    const sortKey =
      layout !== '__chefs__'
        ? groupField || '—'
        : `${reg.nom || ''} ${reg.prenom || ''}`.trim();
    return {
      sortKey,
      regId: reg.id,
      prenom: reg.prenom || '',
      nom: reg.nom || '',
      email: reg.email || '—',
      telephone: reg.telephone || '—',
      filiere: reg.filiere || '—',
      type: isGroup ? 'Groupe' : 'Personne',
      membres: formatCompanions(reg.accompagnants),
      groupField,
      groupFieldLabel: layout !== '__chefs__' ? getFieldLabel(meta, layout) : '',
      paiement: paymentStatusLabel(reg, eventPaid),
      frais,
      createdAt: reg.created_at,
      reg,
    };
  });

  rows.sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey), 'fr'));
  return rows;
}

function buildRegsMeta(event) {
  const chefFields = [
    ...(event.champs_chef || event.champs_personnalises || []),
    ...(event.champs_communs || []),
  ];
  const memberFields = [
    ...(event.champs_membres || []),
    ...(event.champs_communs || []),
  ];
  return {
    type: event.formulaire_type || 'individuel',
    chefFields,
    memberFields,
    fields: [...chefFields, ...(event.champs_membres || [])],
  };
}

export default function ManageEvents() {
  const { canEdit } = useAuth();
  const canEditPage = canEdit('events');
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [regs, setRegs] = useState(null);
  const [regsTitle, setRegsTitle] = useState('');
  const [regsMeta, setRegsMeta] = useState({
    type: 'individuel',
    chefFields: [],
    memberFields: [],
    fields: [],
  });
  const [regDetail, setRegDetail] = useState(null);
  const [regsEventId, setRegsEventId] = useState(null);
  const [selectedRegistrationIds, setSelectedRegistrationIds] = useState(() => new Set());
  const [savedListeFinaleAt, setSavedListeFinaleAt] = useState(null);
  const [savingListe, setSavingListe] = useState(false);
  const [sendingMail, setSendingMail] = useState(false);
  const [showChosenList, setShowChosenList] = useState(false);
  const [mailSubject, setMailSubject] = useState(DEFAULT_SELECTION_MAIL_SUBJECT);
  const [mailBody, setMailBody] = useState(DEFAULT_SELECTION_MAIL_BODY);
  const [regsPaid, setRegsPaid] = useState(false);
  const [regsPrix, setRegsPrix] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [paymentBusyId, setPaymentBusyId] = useState(null);
  const [exportLayout, setExportLayout] = useState('__chefs__');
  const [exportScope, setExportScope] = useState('filtered');
  const [downloadingList, setDownloadingList] = useState(false);
  const [dateMin, setDateMin] = useState(() => defaultDateTimeMin());

  const load = () =>
    api
      .get('/events')
      .then((res) => setItems(res.data))
      .catch(() => setError('Chargement impossible.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!regDetail) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setRegDetail(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [regDetail]);

  const reset = () => {
    setForm(empty);
    setEditId(null);
    setDateMin(defaultDateTimeMin());
  };

  const onEdit = (item) => {
    setEditId(item.id);
    const localDate = toLocalInput(item.date);
    setDateMin(minSelectableDateTime(localDate));
    setForm({
      titre: item.titre,
      description: item.description,
      date: localDate,
      lieu: item.lieu || '',
      image: null,
      image_url: item.image || '',
      payant: !!item.payant,
      prix: item.prix || '',
      audience: item.audience === 'membres' ? 'membres' : 'public',
      formulaire_type: fromApiFormType(item.formulaire_type),
      accompagnants_min: item.accompagnants_min ?? 1,
      accompagnants_max: item.accompagnants_max ?? 3,
      champs_chef: mapAdminFields(item.champs_chef || item.champs_personnalises),
      champs_membres: mapAdminFields(item.champs_membres),
      champs_communs: mapAdminFields(item.champs_communs),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const data = new FormData();
    data.append('titre', form.titre);
    data.append('description', form.description);
    data.append('date', form.date.replace('T', ' ') + ':00');
    data.append('lieu', form.lieu);
    data.append('payant', form.payant ? '1' : '0');
    data.append('prix', form.prix || '');
    data.append('audience', form.audience === 'membres' ? 'membres' : 'public');
    data.append(
      'statut',
      form.date && new Date(form.date).getTime() < Date.now() ? 'passe' : 'a_venir'
    );
    data.append('formulaire_type', form.formulaire_type);
    data.append('accompagnants_min', String(form.accompagnants_min));
    data.append('accompagnants_max', String(form.accompagnants_max));
    data.append('champs_chef', JSON.stringify(toApiFields(form.champs_chef)));
    data.append('champs_membres', JSON.stringify(toApiFields(form.champs_membres)));
    data.append('champs_communs', JSON.stringify(toApiFields(form.champs_communs)));
    if (form.image) data.append('image', form.image);

    setSaving(true);
    try {
      if (editId) await api.put(`/events/${editId}`, data);
      else await api.post('/events', data);
      setSuccess(editId ? 'Événement mis à jour.' : 'Événement créé.');
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
      title: 'Supprimer cet événement ?',
      message: 'Cette action est définitive. L’événement ne sera plus visible sur le site.',
    });
    if (!ok) return;
    try {
      await api.delete(`/events/${id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  const toggleInscription = async (item) => {
    setError('');
    setSuccess('');
    try {
      const { data } = await api.patch(`/events/${item.id}/inscription`, {
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

  const addQuestion = (target) => {
    setForm((f) => ({
      ...f,
      [target]: [...(f[target] || []), createBlankQuestion()],
    }));
  };

  const openRegs = async (item) => {
    setError('');
    setSuccess('');
    try {
      const [{ data: registrations }, { data: event }] = await Promise.all([
        api.get(`/events/${item.id}/registrations`),
        api.get(`/events/${item.id}`),
      ]);
      setRegs(registrations);
      setRegsTitle(event.titre || item.titre);
      setRegsEventId(event.id);
      setRegsMeta(buildRegsMeta(event));
      setRegsPaid(!!event.payant);
      setRegsPrix(event.payant && event.prix ? String(event.prix) : '');
      setPaymentFilter('all');
      setExportLayout('__chefs__');
      setExportScope('filtered');
      setRegDetail(null);
      setShowChosenList(false);
      setMailSubject(DEFAULT_SELECTION_MAIL_SUBJECT);
      setMailBody(DEFAULT_SELECTION_MAIL_BODY);
      const saved = event.liste_finale;
      const savedIds = Array.isArray(saved?.registration_ids) ? saved.registration_ids : [];
      setSelectedRegistrationIds(new Set(savedIds.map((id) => Number(id))));
      setSavedListeFinaleAt(event.liste_finale_at || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Chargement des inscrits impossible.');
    }
  };

  const finalList = useMemo(() => {
    if (!regs?.length) return [];
    return regs
      .filter((r) => selectedRegistrationIds.has(Number(r.id)))
      .map(buildFinalRow);
  }, [regs, selectedRegistrationIds]);

  const chosenDisplayRows = useMemo(() => {
    const selected = (regs || []).filter((r) => selectedRegistrationIds.has(Number(r.id)));
    return buildExportRows(selected, exportLayout, regsMeta, {
      eventPaid: regsPaid,
      eventPrix: regsPrix,
    });
  }, [regs, selectedRegistrationIds, exportLayout, regsMeta, regsPaid, regsPrix]);

  const toggleRegistration = (id) => {
    setSelectedRegistrationIds((prev) => {
      const next = new Set(prev);
      const n = Number(id);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const selectAllRegistrations = () => {
    setSelectedRegistrationIds(new Set((regs || []).map((r) => Number(r.id))));
  };

  const clearRegistrationSelection = () => {
    setSelectedRegistrationIds(new Set());
  };

  const closeRegs = () => {
    setRegs(null);
    setRegDetail(null);
    setRegsEventId(null);
    setSelectedRegistrationIds(new Set());
    setShowChosenList(false);
    setSavedListeFinaleAt(null);
    setRegsPaid(false);
    setRegsPrix('');
    setPaymentFilter('all');
    setExportLayout('__chefs__');
    setExportScope('filtered');
  };

  const filteredRegs = useMemo(() => {
    if (!regs?.length) return [];
    if (!regsPaid || paymentFilter === 'all') return regs;
    if (paymentFilter === 'validated') return regs.filter((r) => r.paiement_valide);
    if (paymentFilter === 'pending') {
      return regs.filter((r) => r.accepte_paiement && !r.paiement_valide);
    }
    if (paymentFilter === 'refused') return regs.filter((r) => !r.accepte_paiement);
    return regs;
  }, [regs, regsPaid, paymentFilter]);

  const exportSourceRegs = useMemo(() => {
    if (!regs?.length) return [];
    if (exportScope === 'all') return regs;
    if (exportScope === 'selected') {
      return regs.filter((r) => selectedRegistrationIds.has(Number(r.id)));
    }
    return filteredRegs;
  }, [regs, exportScope, filteredRegs, selectedRegistrationIds]);

  const exportRows = useMemo(
    () =>
      buildExportRows(exportSourceRegs, exportLayout, regsMeta, {
        eventPaid: regsPaid,
        eventPrix: regsPrix,
      }),
    [exportSourceRegs, exportLayout, regsMeta, regsPaid, regsPrix]
  );

  const exportLayoutLabel = useMemo(() => {
    if (exportLayout === '__chefs__') return 'Par chef d’équipe / inscription';
    if (exportLayout === '__membres__') return 'Par membre du groupe';
    return `Par « ${getFieldLabel(regsMeta, exportLayout)} »`;
  }, [exportLayout, regsMeta]);

  const tableRows = useMemo(
    () =>
      buildExportRows(filteredRegs, exportLayout, regsMeta, {
        eventPaid: regsPaid,
        eventPrix: regsPrix,
      }),
    [filteredRegs, exportLayout, regsMeta, regsPaid, regsPrix]
  );

  const layoutFieldLabel =
    exportLayout !== '__chefs__' && exportLayout !== '__membres__'
      ? getFieldLabel(regsMeta, exportLayout)
      : '';

  const downloadRegistrationsPdf = async (sourceRegs, { titleSuffix = '', filePrefix = 'inscrits' } = {}) => {
    const source = sourceRegs || exportSourceRegs;
    if (!source.length) {
      setError('Aucune inscription à exporter.');
      return;
    }
    setDownloadingList(true);
    setError('');
    try {
      const rows = buildExportRows(source, exportLayout, regsMeta, {
        eventPaid: regsPaid,
        eventPrix: regsPrix,
      });
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const listTitle = titleSuffix
        ? `ENISO Team — ${titleSuffix}`
        : 'ENISO Team — Liste des inscrits';
      doc.setFontSize(16);
      doc.text(listTitle, 14, 18);
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(`Événement : ${regsTitle || '—'}`, 14, 28);
      doc.text(`Format : ${exportLayoutLabel}`, 14, 34);
      doc.text(`Candidats : ${rows.length}`, 14, 40);
      let startY = 46;
      if (regsPaid && regsPrix) {
        doc.text(
          `Frais d'inscription : ${regsPrix}${/dt/i.test(String(regsPrix)) ? '' : ' DT'}`,
          14,
          46
        );
        startY = 52;
      }
      doc.setTextColor(0, 0, 0);

      let head = [];
      let body = [];

      if (exportLayout === '__membres__') {
        head = [['#', 'Rôle', 'Prénom', 'Nom', 'Équipe']];
        body = rows.map((row, idx) => [
          String(idx + 1),
          row.role,
          row.prenom || '—',
          row.nom || '—',
          row.equipe || '—',
        ]);
      } else {
        head = [
          [
            '#',
            ...(exportLayout !== '__chefs__' ? [getFieldLabel(regsMeta, exportLayout)] : []),
            'Prénom',
            'Nom',
          ],
        ];
        body = rows.map((row, idx) => [
          String(idx + 1),
          ...(exportLayout !== '__chefs__' ? [row.groupField || '—'] : []),
          row.prenom || '—',
          row.nom || '—',
        ]);
      }

      autoTable(doc, {
        startY,
        head,
        body,
        styles: { fontSize: 8.5, cellPadding: 2 },
        headStyles: { fillColor: [22, 57, 107], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 248, 252] },
        margin: { left: 14, right: 14 },
      });

      const stamp = new Date().toISOString().slice(0, 10);
      const safeTitle = String(regsTitle || 'evenement')
        .replace(/[^\w\-]+/g, '_')
        .slice(0, 40);
      doc.save(`${filePrefix}_${safeTitle}_${stamp}.pdf`);
      setSuccess('Liste PDF téléchargée.');
    } catch {
      setError('Téléchargement PDF impossible.');
    } finally {
      setDownloadingList(false);
    }
  };

  const downloadChosenListPdf = () => {
    const selected = (regs || []).filter((r) => selectedRegistrationIds.has(Number(r.id)));
    if (!selected.length) {
      setError('Aucun candidat choisi à télécharger.');
      return;
    }
    return downloadRegistrationsPdf(selected, {
      titleSuffix: 'Liste des candidats choisis',
      filePrefix: 'candidats_choisis',
    });
  };

  const togglePayment = async (registration) => {
    if (!regsEventId) return;
    setPaymentBusyId(registration.id);
    setError('');
    try {
      const { data } = await api.patch(
        `/events/${regsEventId}/registrations/${registration.id}/paiement`,
        { paiement_valide: !registration.paiement_valide }
      );
      setRegs((prev) => prev.map((r) => (Number(r.id) === Number(data.id) ? data : r)));
    } catch (err) {
      setError(err.response?.data?.message || 'Mise à jour du paiement impossible.');
    } finally {
      setPaymentBusyId(null);
    }
  };

  const saveFinalList = async () => {
    if (!regsEventId || !finalList.length) return;
    setSavingListe(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await api.put(`/events/${regsEventId}/liste-finale`, {
        personnes: finalList,
        registration_ids: [...selectedRegistrationIds],
      });
      setSavedListeFinaleAt(data.liste_finale_at || null);
      setItems((prev) =>
        prev.map((x) =>
          Number(x.id) === Number(regsEventId)
            ? {
                ...x,
                liste_finale: data.liste_finale,
                liste_finale_at: data.liste_finale_at,
              }
            : x
        )
      );
      setSuccess(data.message || 'Liste enregistrée.');
    } catch (err) {
      setError(err.response?.data?.message || 'Enregistrement impossible.');
    } finally {
      setSavingListe(false);
    }
  };

  const sendSelectionEmails = async () => {
    if (!regsEventId || !selectedRegistrationIds.size) {
      setError('Sélectionnez au moins un candidat.');
      return;
    }
    if (!mailBody.trim()) {
      setError('Rédigez le contenu du mail.');
      return;
    }
    const ok = await confirm({
      title: 'Envoyer les mails ?',
      message: `Envoyer un mail à ${selectedRegistrationIds.size} chef(s) d'équipe sélectionné(s) ?`,
      tone: 'primary',
      confirmLabel: 'Envoyer',
    });
    if (!ok) return;
    setSendingMail(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await api.post(`/events/${regsEventId}/send-selection-emails`, {
        registration_ids: [...selectedRegistrationIds],
        subject: mailSubject,
        body: mailBody,
      });
      setSuccess(data.message || 'Mails envoyés.');
      if (data.failed?.length) {
        const failedList = data.failed
          .map((f) => {
            const who = f.email || `#${f.id}`;
            return f.error ? `${who} (${f.error})` : who;
          })
          .filter(Boolean)
          .join(', ');
        if (failedList) setError(`Échecs d'envoi : ${failedList}`);
      }
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (status === 404) {
        setError('Service mail indisponible. Redémarrez le serveur backend (npm start).');
      } else {
        setError(msg || 'Envoi impossible.');
      }
    } finally {
      setSendingMail(false);
    }
  };

  const overview = useMemo(() => {
    const open = items.filter((i) => i.inscription_ouverte).length;
    const candidates = items.reduce((sum, i) => sum + Number(i.inscriptions_count || 0), 0);
    return { total: items.length, open, candidates };
  }, [items]);

  if (loading) return <Loader />;

  const leaderRows = regDetail ? leaderAnswerRows(regDetail, regsMeta) : [];

  const regDetailModal =
    regDetail &&
    createPortal(
      <div className={styles.overlay} onClick={() => setRegDetail(null)} role="presentation">
        <div
          className={styles.detail}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Détails de l'inscription"
        >
          <button type="button" className={styles.close} onClick={() => setRegDetail(null)}>
            ×
          </button>
          <h2>
            {regDetail.prenom} {regDetail.nom}
          </h2>
          <p className={styles.detailMeta}>
            {regDetail.email}
            {regDetail.telephone ? ` · ${regDetail.telephone}` : ''}
            {regDetail.filiere ? ` · ${regDetail.filiere}` : ''}
          </p>
          <p className={styles.detailMeta}>
            Type :{' '}
            {parseAnswers(regDetail.reponses_personnalisees).mode_inscription === 'groupe'
              ? 'Groupe'
              : 'Personne'}
          </p>

          {leaderRows.length > 0 && (
            <div className={styles.detailSection}>
              <h3>Réponses</h3>
              <dl className={styles.answerList}>
                {leaderRows.map((row) => (
                  <div key={row.id} className={styles.answerRow}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {(regDetail.accompagnants || []).length > 0 && (
            <div className={styles.detailSection}>
              <h3>Membres du groupe</h3>
              <ul className={styles.memberList}>
                {regDetail.accompagnants.map((c, index) => {
                  const name = `${c.prenom || ''} ${c.nom || ''}`.trim() || `Membre ${index + 1}`;
                  const rows = answerEntries(c.reponses, regsMeta.memberFields);
                  return (
                    <li key={`${name}-${index}`}>
                      <strong>{name}</strong>
                      {rows.length > 0 ? (
                        <dl className={styles.answerList}>
                          {rows.map((row) => (
                            <div key={row.id} className={styles.answerRow}>
                              <dt>{row.label}</dt>
                              <dd>{row.value}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {!registrationHasDetails(regDetail, regsMeta) && (
            <p className={styles.empty}>Aucune réponse enregistrée.</p>
          )}
        </div>
      </div>,
      document.body
    );

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <p className={styles.eyebrow}>Secrétariat</p>
        <h1>Événements</h1>
        <p>
          Créez les formulaires d’inscription aux événements, choisissez les questions
          obligatoires ou facultatives, puis suivez les inscrits.
        </p>
      </header>

      <ReadOnlyBanner module="events" />
      <fieldset disabled={!canEditPage} style={{ border: 0, padding: 0, margin: 0, minInlineSize: 0 }}>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span>Événements</span>
          <strong>{overview.total}</strong>
        </div>
        <div className={styles.stat}>
          <span>Inscriptions ouvertes</span>
          <strong>{overview.open}</strong>
        </div>
        <div className={styles.stat}>
          <span>Inscrits au total</span>
          <strong>{overview.candidates}</strong>
        </div>
      </div>

      <form className={styles.composer} onSubmit={onSubmit}>
        <div className={styles.gformBanner}>
          <p className={styles.gformBannerEyebrow}>ENISO Team · Admin</p>
          <h2>{editId ? 'Modifier l’événement' : 'Nouvel événement'}</h2>
          <p>
            {editId
              ? 'Mettez à jour les informations et les questions du formulaire.'
              : 'Créez un formulaire d’inscription au style Google Forms.'}
          </p>
          {editId && <span className={styles.editBadge}>Mode édition</span>}
        </div>

        <div className={styles.gformCard}>
          <label htmlFor="evt-titre">
            Titre de l’événement <span>*</span>
          </label>
          <input
            id="evt-titre"
            value={form.titre}
            onChange={(e) => setForm({ ...form, titre: e.target.value })}
            required
            placeholder="Réponse courte"
          />
        </div>

        <div className={styles.gformCard}>
          <label htmlFor="evt-affiche">Affiche / image</label>
          {(form.image || form.image_url) && (
            <img
              src={form.image ? URL.createObjectURL(form.image) : assetUrl(form.image_url)}
              alt="Aperçu affiche"
              className={styles.affichePreview}
            />
          )}
          <input
            id="evt-affiche"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) =>
              setForm({
                ...form,
                image: e.target.files?.[0] || null,
              })
            }
          />
          <p className={styles.afficheHint}>
            JPG, PNG ou WebP. {editId ? 'Laissez vide pour conserver l’image actuelle.' : ''}
          </p>
        </div>

        <div className={styles.gformCard}>
          <label htmlFor="evt-description">
            Description <span>*</span>
          </label>
          <textarea
            id="evt-description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
            placeholder="Réponse longue"
            rows={4}
          />
        </div>

        <div className={styles.gformCard}>
          <label htmlFor="evt-date">
            Date &amp; heure <span>*</span>
          </label>
          <input
            id="evt-date"
            type="datetime-local"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            min={dateMin}
            required
          />
        </div>

        <div className={styles.gformCard}>
          <label htmlFor="evt-lieu">Lieu</label>
          <input
            id="evt-lieu"
            value={form.lieu}
            onChange={(e) => setForm({ ...form, lieu: e.target.value })}
            placeholder="Réponse courte"
          />
        </div>

        <div className={styles.gformCard}>
          <p className={styles.gformQuestion}>Frais d&apos;inscription ?</p>
          <div className={styles.gformChoices}>
            <label className={styles.gformChoice}>
              <input
                type="radio"
                name="evt-payant"
                checked={form.payant === true}
                onChange={() => setForm({ ...form, payant: true })}
              />
              Payant
            </label>
            <label className={styles.gformChoice}>
              <input
                type="radio"
                name="evt-payant"
                checked={form.payant === false}
                onChange={() => setForm({ ...form, payant: false, prix: '' })}
              />
              Gratuit
            </label>
          </div>
        </div>

        {form.payant && (
          <div className={styles.gformCard}>
            <label htmlFor="evt-prix">
              Montant (DT) <span>*</span>
            </label>
            <input
              id="evt-prix"
              value={form.prix}
              onChange={(e) => setForm({ ...form, prix: e.target.value })}
              placeholder="Ex. 15"
              required
            />
          </div>
        )}

        <div className={styles.gformCard}>
          <p className={styles.gformQuestion}>
            Visible pour <span>*</span>
          </p>
          <div className={styles.gformChoices}>
            <label className={styles.gformChoice}>
              <input
                type="radio"
                name="evt-visibilite"
                checked={form.audience === 'public'}
                onChange={() => setForm({ ...form, audience: 'public' })}
              />
              Tout le monde
            </label>
            <label className={styles.gformChoice}>
              <input
                type="radio"
                name="evt-visibilite"
                checked={form.audience === 'membres'}
                onChange={() => setForm({ ...form, audience: 'membres' })}
              />
              Membres uniquement
            </label>
          </div>
        </div>

        <div className={styles.gformCard}>
          <p className={styles.gformQuestion}>
            Ce formulaire est destiné à <span>*</span>
          </p>
          <div className={styles.gformChoices}>
            <label className={styles.gformChoice}>
              <input
                type="radio"
                name="evt-audience"
                checked={form.formulaire_type === 'personne'}
                onChange={() => setForm({ ...form, formulaire_type: 'personne' })}
              />
              Une personne seulement
            </label>
            <label className={styles.gformChoice}>
              <input
                type="radio"
                name="evt-audience"
                checked={form.formulaire_type === 'groupe'}
                onChange={() => setForm({ ...form, formulaire_type: 'groupe' })}
              />
              Un groupe seulement
            </label>
            <label className={styles.gformChoice}>
              <input
                type="radio"
                name="evt-audience"
                checked={form.formulaire_type === 'les_deux'}
                onChange={() => setForm({ ...form, formulaire_type: 'les_deux' })}
              />
              Personne et groupe
            </label>
          </div>
        </div>

        {(form.formulaire_type === 'groupe' || form.formulaire_type === 'les_deux') && (
          <>
            <div className={styles.gformCard}>
              <label htmlFor="evt-acc-min">
                Nombre min. de membres du groupe (en plus du responsable) <span>*</span>
              </label>
              <input
                id="evt-acc-min"
                type="number"
                min={1}
                value={form.accompagnants_min}
                onChange={(e) =>
                  setForm({ ...form, accompagnants_min: Number(e.target.value) })
                }
                required
              />
            </div>
            <div className={styles.gformCard}>
              <label htmlFor="evt-acc-max">
                Nombre max. de membres du groupe (en plus du responsable) <span>*</span>
              </label>
              <input
                id="evt-acc-max"
                type="number"
                min={1}
                value={form.accompagnants_max}
                onChange={(e) =>
                  setForm({ ...form, accompagnants_max: Number(e.target.value) })
                }
                required
              />
            </div>
          </>
        )}

        <div className={styles.gformSection}>
          <div className={styles.gformSectionHead}>
            <div>
              <h3>Questions chef d’équipe</h3>
              <p>Uniquement pour le responsable qui remplit le formulaire.</p>
            </div>
            <button
              type="button"
              className={styles.gformAddBtn}
              onClick={() => addQuestion('champs_chef')}
              title="Ajouter une question chef d’équipe"
            >
              +
            </button>
          </div>
          <GoogleFormBuilder
            value={form.champs_chef}
            onChange={(champs_chef) => setForm((f) => ({ ...f, champs_chef }))}
            emptyHint="Aucune question dédiée au chef d’équipe. Cliquez sur + pour en ajouter."
          />
        </div>

        {(form.formulaire_type === 'groupe' || form.formulaire_type === 'les_deux') && (
          <>
            <div className={styles.gformSection}>
              <div className={styles.gformSectionHead}>
                <div>
                  <h3>Questions membres du groupe</h3>
                  <p>Posées à chaque membre, pas au chef d’équipe.</p>
                </div>
                <button
                  type="button"
                  className={styles.gformAddBtn}
                  onClick={() => addQuestion('champs_membres')}
                  title="Ajouter une question membre"
                >
                  +
                </button>
              </div>
              <GoogleFormBuilder
                value={form.champs_membres}
                onChange={(champs_membres) => setForm((f) => ({ ...f, champs_membres }))}
                emptyHint="Aucune question dédiée aux membres. Cliquez sur + pour en ajouter."
              />
            </div>

            <div className={styles.gformSection}>
              <div className={styles.gformSectionHead}>
                <div>
                  <h3>Questions communes</h3>
                  <p>Posées au chef d’équipe et à chaque membre du groupe.</p>
                </div>
                <button
                  type="button"
                  className={styles.gformAddBtn}
                  onClick={() => addQuestion('champs_communs')}
                  title="Ajouter une question commune"
                >
                  +
                </button>
              </div>
              <GoogleFormBuilder
                value={form.champs_communs}
                onChange={(champs_communs) => setForm((f) => ({ ...f, champs_communs }))}
                emptyHint="Aucune question commune. Cliquez sur + pour en ajouter."
              />
            </div>
          </>
        )}

        <div className={styles.gformActions}>
          {editId && (
            <button type="button" className={styles.gformClear} onClick={reset}>
              Annuler
            </button>
          )}
          <div className={styles.gformActionsRight}>
            <button type="submit" className={styles.gformSubmit} disabled={saving}>
              {saving ? 'Enregistrement…' : editId ? 'Mettre à jour' : 'Créer le formulaire'}
            </button>
          </div>
        </div>
      </form>

      <section className={styles.listPanel}>
        <div className={styles.listHead}>
          <h2>Événements publiés</h2>
          <span className={`${styles.chip} ${styles.chipMuted}`}>{items.length} au total</span>
        </div>
        {!items.length ? (
          <p className={styles.empty}>Aucun événement pour le moment.</p>
        ) : (
          <div className={styles.tripGrid}>
            {items.map((item) => (
              <article key={item.id} className={styles.tripCard}>
                <div className={styles.tripTop}>
                  {item.image && (
                    <img
                      src={assetUrl(item.image)}
                      alt={`Affiche ${item.titre}`}
                      className={styles.tripAffiche}
                    />
                  )}
                  <div>
                    <div className={styles.tripMeta}>
                      <span className={styles.chip}>{formTypeLabel(item.formulaire_type)}</span>
                      <span className={styles.chip}>
                        {item.audience === 'membres' ? 'Membres' : 'Public'}
                      </span>
                      {item.lieu && (
                        <span className={`${styles.chip} ${styles.chipMuted}`}>{item.lieu}</span>
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
                      {item.date ? new Date(item.date).toLocaleString('fr-FR') : '—'}
                    </strong>
                  </span>
                  <span>
                    Prix{' '}
                    <strong>
                      {item.payant
                        ? `${item.prix || '—'}${item.prix && !/dt/i.test(String(item.prix)) ? ' DT' : ''}`
                        : 'Gratuit'}
                    </strong>
                  </span>
                  <span>
                    Questions{' '}
                    <strong>
                      {Number(
                        (item.champs_chef || []).length +
                          (item.champs_membres || []).length +
                          (item.champs_communs || []).length ||
                          (item.champs_personnalises || []).length
                      )}
                    </strong>
                  </span>
                  <span>
                    Inscrits <strong>{Number(item.inscriptions_count || 0)}</strong>
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
                  >
                    Inscrits ({Number(item.inscriptions_count || 0)})
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

      {regDetailModal}

      {regs && (
        <section className={styles.regsPanel} role="dialog" aria-label={`Inscrits — ${regsTitle}`}>
          <div className={styles.regsHead}>
            <div>
              <h2>Inscrits — {regsTitle}</h2>
              <p>
                {regs.length} inscription{regs.length > 1 ? 's' : ''}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={closeRegs}
            >
              Fermer
            </button>
          </div>
          {!regs.length ? (
            <p className={styles.empty}>Aucune inscription pour le moment.</p>
          ) : (
            <>
              <div className={styles.filters}>
                <div className={styles.listActions}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={selectAllRegistrations}
                  >
                    Tout sélectionner
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={clearRegistrationSelection}
                  >
                    Tout désélectionner
                  </button>
                  <span className={styles.selectionCount}>
                    {selectedRegistrationIds.size} sélectionné
                    {selectedRegistrationIds.size > 1 ? 's' : ''}
                    {' · '}
                    {filteredRegs.length} affiché{filteredRegs.length > 1 ? 's' : ''}
                  </span>
                  <button
                    type="button"
                    className={`btn btn-sm ${showChosenList ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setShowChosenList((v) => !v)}
                  >
                    Liste des candidats choisis ({finalList.length})
                  </button>
                </div>
                {regsPaid && (
                  <label>
                    Filtrer par paiement
                    <select
                      value={paymentFilter}
                      onChange={(e) => setPaymentFilter(e.target.value)}
                    >
                      <option value="all">Tous</option>
                      <option value="validated">Paiement validé</option>
                      <option value="pending">En attente de validation</option>
                      <option value="refused">Paiement refusé</option>
                    </select>
                  </label>
                )}
              </div>

              <div className={styles.exportBar}>
                <label>
                  Organisation de la liste
                  <select
                    value={exportLayout}
                    onChange={(e) => setExportLayout(e.target.value)}
                  >
                    <option value="__chefs__">Par chef d&apos;équipe / inscription</option>
                    <option value="__membres__">Par membre du groupe</option>
                    {(regsMeta.fields || []).map((f) => (
                      <option key={f.id} value={f.id}>
                        Par « {f.label} »
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Inscriptions à exporter
                  <select value={exportScope} onChange={(e) => setExportScope(e.target.value)}>
                    <option value="filtered">
                      Liste filtrée ({filteredRegs.length})
                    </option>
                    <option value="all">Toutes ({regs.length})</option>
                    <option value="selected">
                      Sélection ({selectedRegistrationIds.size})
                    </option>
                  </select>
                </label>
                <div className={styles.listActions}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => downloadRegistrationsPdf()}
                    disabled={downloadingList || !exportSourceRegs.length}
                  >
                    {downloadingList ? 'Export…' : 'Télécharger PDF'}
                  </button>
                </div>
                <p className={styles.exportHint}>
                  {exportLayoutLabel} — {exportRows.length} ligne
                  {exportRows.length > 1 ? 's' : ''} dans l&apos;export. Le tableau ci-dessous
                  suit le même format.
                  {(regsMeta.fields || []).length === 0
                    ? ' Ajoutez des questions personnalisées (nom de groupe, robot, etc.) pour plus d’options.'
                    : ''}
                </p>
              </div>

              <div className={styles.tableWrap}>
                <table>
                  {exportLayout === '__membres__' ? (
                    <>
                      <thead>
                        <tr>
                          <th className={styles.checkCol}>
                            <span className="sr-only">Sélection</span>
                          </th>
                          <th>Rôle</th>
                          <th>Prénom</th>
                          <th>Nom</th>
                          <th>Équipe</th>
                          {regsPaid && <th>Paiement</th>}
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.map((row, index) => {
                          const r = row.reg;
                          const isChef = row.role === 'Chef';
                          return (
                            <tr key={`${row.regId}-${row.role}-${index}`}>
                              <td className={styles.checkCol}>
                                {isChef ? (
                                  <input
                                    type="checkbox"
                                    checked={selectedRegistrationIds.has(Number(row.regId))}
                                    onChange={() => toggleRegistration(row.regId)}
                                    aria-label={`Sélectionner ${row.prenom} ${row.nom}`}
                                  />
                                ) : null}
                              </td>
                              <td>{row.role}</td>
                              <td>{row.prenom || '—'}</td>
                              <td>{row.nom || '—'}</td>
                              <td>{row.equipe || '—'}</td>
                              {regsPaid && (
                                <td>
                                  {isChef ? (
                                    <>
                                      <span
                                        className={`${styles.chip} ${
                                          r.paiement_valide
                                            ? styles.chipOk
                                            : r.accepte_paiement
                                              ? styles.chipPending
                                              : styles.chipClosed
                                        }`}
                                      >
                                        {row.paiement}
                                      </span>
                                      <button
                                        type="button"
                                        className={`btn btn-sm ${
                                          r.paiement_valide ? 'btn-secondary' : 'btn-primary'
                                        }`}
                                        style={{ marginTop: '0.35rem' }}
                                        disabled={paymentBusyId === r.id}
                                        onClick={() => togglePayment(r)}
                                      >
                                        {paymentBusyId === r.id
                                          ? '…'
                                          : r.paiement_valide
                                            ? 'Annuler'
                                            : 'Valider'}
                                      </button>
                                    </>
                                  ) : (
                                    row.paiement
                                  )}
                                </td>
                              )}
                              <td>
                                {row.createdAt
                                  ? new Date(row.createdAt).toLocaleString('fr-FR')
                                  : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </>
                  ) : (
                    <>
                      <thead>
                        <tr>
                          <th className={styles.checkCol}>
                            <span className="sr-only">Sélection</span>
                          </th>
                          {layoutFieldLabel ? <th>{layoutFieldLabel}</th> : null}
                          <th>Nom</th>
                          <th>Email</th>
                          <th>Téléphone</th>
                          <th>Filière</th>
                          <th>Type</th>
                          <th>Groupe</th>
                          {(regsMeta.fields || []).length > 0 && <th>Réponses</th>}
                          {regsPaid && <th>Paiement</th>}
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.map((row) => {
                          const r = row.reg;
                          return (
                            <tr key={r.id}>
                              <td className={styles.checkCol}>
                                <input
                                  type="checkbox"
                                  checked={selectedRegistrationIds.has(Number(r.id))}
                                  onChange={() => toggleRegistration(r.id)}
                                  aria-label={`Sélectionner ${r.prenom} ${r.nom}`}
                                />
                              </td>
                              {layoutFieldLabel ? (
                                <td>
                                  <strong>{row.groupField || '—'}</strong>
                                </td>
                              ) : null}
                              <td>
                                {r.prenom} {r.nom}
                              </td>
                              <td>{r.email}</td>
                              <td>{r.telephone}</td>
                              <td>{r.filiere || '—'}</td>
                              <td>{row.type}</td>
                              <td>{row.membres}</td>
                              {(regsMeta.fields || []).length > 0 && (
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRegDetail(r);
                                    }}
                                  >
                                    Voir
                                  </button>
                                </td>
                              )}
                              {regsPaid && (
                                <td>
                                  <span
                                    className={`${styles.chip} ${
                                      r.paiement_valide
                                        ? styles.chipOk
                                        : r.accepte_paiement
                                          ? styles.chipPending
                                          : styles.chipClosed
                                    }`}
                                  >
                                    {paymentStatusLabel(r, regsPaid)}
                                  </span>
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${
                                      r.paiement_valide ? 'btn-secondary' : 'btn-primary'
                                    }`}
                                    style={{ marginTop: '0.35rem' }}
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
                              <td>{new Date(r.created_at).toLocaleString('fr-FR')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </>
                  )}
                </table>
              </div>

              {showChosenList && (
                <div className={styles.listBlock}>
                  <div className={styles.listHead}>
                    <div className={styles.listHeadRow}>
                      <div>
                        <h3>Liste des candidats choisis ({finalList.length})</h3>
                        <p>
                          Chefs d&apos;équipe et inscriptions individuelles retenues.
                          {savedListeFinaleAt
                            ? ` Dernière sauvegarde : ${new Date(
                                savedListeFinaleAt
                              ).toLocaleString('fr-FR')}.`
                            : ''}
                        </p>
                      </div>
                      <div className={styles.listActions}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={downloadChosenListPdf}
                          disabled={downloadingList || !finalList.length}
                        >
                          {downloadingList ? 'Export…' : 'Télécharger PDF'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={saveFinalList}
                          disabled={savingListe || !finalList.length}
                        >
                          {savingListe ? 'Enregistrement…' : 'Enregistrer la liste'}
                        </button>
                      </div>
                    </div>
                  </div>
                  {finalList.length ? (
                    <div className={styles.tableWrap}>
                      <table>
                        {exportLayout === '__membres__' ? (
                          <>
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Rôle</th>
                                <th>Prénom</th>
                                <th>Nom</th>
                                <th>Équipe</th>
                              </tr>
                            </thead>
                            <tbody>
                              {chosenDisplayRows.map((row, idx) => (
                                <tr key={`chosen-${row.regId}-${row.role}-${idx}`}>
                                  <td>{idx + 1}</td>
                                  <td>{row.role}</td>
                                  <td>{row.prenom || '—'}</td>
                                  <td>{row.nom || '—'}</td>
                                  <td>{row.equipe || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </>
                        ) : (
                          <>
                            <thead>
                              <tr>
                                <th>#</th>
                                {layoutFieldLabel ? <th>{layoutFieldLabel}</th> : null}
                                <th>Prénom</th>
                                <th>Nom</th>
                                <th>Email</th>
                                <th>Type</th>
                                <th>Groupe</th>
                              </tr>
                            </thead>
                            <tbody>
                              {chosenDisplayRows.map((row, idx) => (
                                <tr key={row.regId || idx}>
                                  <td>{idx + 1}</td>
                                  {layoutFieldLabel ? (
                                    <td>
                                      <strong>{row.groupField || '—'}</strong>
                                    </td>
                                  ) : null}
                                  <td>{row.prenom || '—'}</td>
                                  <td>
                                    <strong>{row.nom || row.reg?.nom || '—'}</strong>
                                  </td>
                                  <td>{row.email || '—'}</td>
                                  <td>{row.type || '—'}</td>
                                  <td>{row.membres || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </>
                        )}
                      </table>
                    </div>
                  ) : (
                    <p className={styles.empty}>Cochez des candidats pour composer la liste.</p>
                  )}
                </div>
              )}

              <div className={styles.listBlock}>
                <div className={styles.listHead}>
                  <div>
                    <h3>Mail aux chefs d&apos;équipe sélectionnés</h3>
                    <p>
                      Le mail sera envoyé à l&apos;email du chef d&apos;équipe de chaque inscription
                      cochée ({selectedRegistrationIds.size}).
                    </p>
                  </div>
                </div>
                <div className={styles.mailComposer}>
                  <label>
                    Objet
                    <input
                      type="text"
                      value={mailSubject}
                      onChange={(e) => setMailSubject(e.target.value)}
                      placeholder="Sélection — [Evenement]"
                    />
                  </label>
                  <label>
                    Message
                    <textarea
                      rows={8}
                      value={mailBody}
                      onChange={(e) => setMailBody(e.target.value)}
                      placeholder="Bonjour [Nom], …"
                    />
                  </label>
                  <p className={styles.mailHint}>
                    Variables disponibles : [Nom], [Evenement], [Date], [Lieu], [Type], [Groupe],
                    [Email]
                  </p>
                  <div className={styles.listActions}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={sendSelectionEmails}
                      disabled={sendingMail || !selectedRegistrationIds.size || !mailBody.trim()}
                    >
                      {sendingMail ? 'Envoi…' : 'Envoyer le mail aux sélectionnés'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </fieldset>
    </div>
  );
}