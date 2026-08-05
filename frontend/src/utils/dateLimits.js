/** Date locale YYYY-MM-DD pour les inputs type="date". */
export function localToday() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Date-heure locale YYYY-MM-DDTHH:mm pour datetime-local. */
export function localNowDateTime() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * min pour un champ date futur : aujourd'hui, sauf si une valeur déjà passée
 * est en cours d'édition (pour ne pas casser le formulaire).
 */
export function minSelectableDate(currentValue = '') {
  const today = localToday();
  const current = String(currentValue || '').slice(0, 10);
  if (current && current < today) return current;
  return today;
}

/**
 * min pour datetime-local : maintenant, sauf édition d'une valeur passée.
 */
export function minSelectableDateTime(currentValue = '') {
  const now = localNowDateTime();
  const current = String(currentValue || '').slice(0, 16);
  if (current && current < now) return current;
  return now;
}

/** Champ « date de naissance » → on autorise le passé, on bloque le futur. */
export function isBirthDateField(field = {}) {
  const id = String(field.id || '').toLowerCase();
  const label = String(field.label || '').toLowerCase();
  return (
    id.includes('birth') ||
    id.includes('naissance') ||
    id.includes('dob') ||
    label.includes('birth') ||
    label.includes('naissance') ||
    label.includes('date of birth')
  );
}
