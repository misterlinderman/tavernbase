/**
 * API base URL for all client fetch calls.
 * Production builds require VITE_API_URL (validated in vite.config.ts).
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;

  if (raw) {
    return raw.replace(/\/+$/, '');
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:3001/api';
  }

  throw new Error('VITE_API_URL is not configured');
}

export const API_BASE_URL = getApiBaseUrl();
