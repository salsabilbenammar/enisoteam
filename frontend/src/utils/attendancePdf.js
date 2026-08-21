/**
 * Génère un PDF « liste de présence » à partir des noms saisis.
 */
export async function downloadAttendancePdf({
  type,
  title,
  date = '',
  time = '',
  place = '',
  people = [],
  blankLines = 0,
  filePrefix = 'liste_presence',
  includeSignature = false,
} = {}) {
  const typeLabels = {
    reunion: 'Réunion',
    assemblee_generale: 'Assemblée générale',
    formation: 'Formation',
  };
  const typeLabel = typeLabels[type] || 'Séance';

  const rows = [];
  for (const p of people || []) {
    const prenom = String(p.prenom || '').trim();
    const nom = String(p.nom || '').trim();
    const full = String(p.fullName || '').trim();
    if (prenom || nom) {
      rows.push({ prenom: prenom || '—', nom: nom || '—' });
    } else if (full) {
      const parts = full.split(/\s+/);
      rows.push({
        prenom: parts[0] || '—',
        nom: parts.slice(1).join(' ') || '—',
      });
    }
  }

  const extras = Math.max(0, Math.floor(Number(blankLines) || 0));
  for (let i = 0; i < extras; i += 1) {
    rows.push({ prenom: '', nom: '' });
  }

  if (!rows.length) {
    throw new Error('Aucun participant à exporter.');
  }

  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFontSize(16);
  doc.text('ENISO Team — Liste de présence', 14, 18);
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(`${typeLabel} : ${title || '—'}`, 14, 28);

  let y = 34;
  if (date) {
    const dateLabel = formatFrDate(date);
    doc.text(`Date : ${dateLabel}${time ? ` · Heure : ${time}` : ''}`, 14, y);
    y += 6;
  } else if (time) {
    doc.text(`Heure : ${time}`, 14, y);
    y += 6;
  }
  if (place) {
    doc.text(`Lieu : ${place}`, 14, y);
    y += 6;
  }
  doc.text(`Participants : ${rows.length}`, 14, y);
  y += 8;
  doc.setTextColor(0, 0, 0);

  const head = includeSignature
    ? [['#', 'Prénom', 'Nom', 'Signature']]
    : [['#', 'Prénom', 'Nom']];
  const body = rows.map((r, idx) => {
    const base = [String(idx + 1), r.prenom || '', r.nom || ''];
    if (includeSignature) base.push('');
    return base;
  });

  autoTable(doc, {
    startY: y,
    head,
    body,
    styles: { fontSize: 10, cellPadding: 2.6, minCellHeight: 8 },
    headStyles: { fillColor: [22, 57, 107], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    margin: { left: 14, right: 14 },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const safeTitle = String(title || typeLabel)
    .replace(/[^\w\-]+/g, '_')
    .slice(0, 40);
  doc.save(`${filePrefix}_${safeTitle}_${stamp}.pdf`);
}

function formatFrDate(value) {
  if (!value) return '—';
  const raw = String(value).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('fr-FR');
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('fr-FR');
}
