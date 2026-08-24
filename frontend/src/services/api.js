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
