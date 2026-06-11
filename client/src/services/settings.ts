import { API_BASE_URL } from '../config/api';
import type { SiteSettings } from '../types';

export async function getSiteSettings(): Promise<SiteSettings> {
  const res = await fetch(`${API_BASE_URL}/site`);

  if (!res.ok) {
    throw new Error('Failed to load site settings');
  }

  const json: { data: SiteSettings } = await res.json();
  return json.data;
}
