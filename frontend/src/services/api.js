import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('eniso_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const assetUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const configured = import.meta.env.VITE_API_URL || '';
  const base = configured
    ? configured.replace(/\/api$/, '')
    : typeof window !== 'undefined'
      ? window.location.origin
      : '';
  return `${base}${path}`;
};

/** Ouvre un fichier /uploads (PDF etc.) avec message clair si absent. */
export async function openUploadAsset(filePath, fallbackName = 'document') {
  const url = assetUrl(filePath);
  if (!url) return;
  try {
    const res = await fetch(url, { method: 'GET' });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || type.includes('application/json') || type.includes('text/plain')) {
      const text = await res.text().catch(() => '');
      window.alert(
        text && text.length < 300
          ? text
          : 'Fichier introuvable. Réuploadez-le depuis l’admin.'
      );
      return;
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (!win) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fallbackName || String(filePath).split('/').pop();
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } catch {
    window.alert('Impossible d’ouvrir le fichier. Vérifiez votre connexion ou réuploadez le document.');
  }
}

/** Ouvre un document d’étape (réservé membres — JWT via api). */
export async function openStepDocument(documentPath, fallbackName = 'document') {
  if (!documentPath) return;
  const filename = String(documentPath).split('/').pop();
  const res = await api.get(`/projects/step-docs/${encodeURIComponent(filename)}`, {
    responseType: 'blob',
  });
  const blobUrl = URL.createObjectURL(res.data);
  const win = window.open(blobUrl, '_blank', 'noopener,noreferrer');
  if (!win) {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fallbackName || filename;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export default api;
