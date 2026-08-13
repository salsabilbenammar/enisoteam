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

/** min stable pour type="date" : aujourd'hui. */
export function defaultDateMin() {
  return localToday();
}

/**
 * min stable pour datetime-local : début de journée (00:00).
 * Évite l'effacement Chrome si la date du jour est choisie avec T00:00.
 * Ne pas utiliser l'heure courante (sinon saisie d'année / heure impossible).
 */
export function defaultDateTimeMin() {
  return `${localToday()}T00:00`;
}

/**
 * min pour un champ date. Si une valeur déjà passée est en édition, on l'autorise.
 */
export function minSelectableDate(currentValue = '') {
  const today = defaultDateMin();
  const current = String(currentValue || '').slice(0, 10);
  if (current && /^\d{4}-\d{2}-\d{2}$/.test(current) && current < today) {
    return current;
  }
  return today;
}

/**
 * min pour datetime-local. Si une valeur déjà passée est en édition, on l'autorise.
 */
export function minSelectableDateTime(currentValue = '') {
  const todayStart = defaultDateTimeMin();
  const current = String(currentValue || '').slice(0, 16);
  if (current && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(current) && current < todayStart) {
    return current;
  }
  return todayStart;
}

/** Champ « date de naissance » → passé ok, futur bloqué. */
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
