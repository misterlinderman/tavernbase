import { API_BASE_URL } from '../config/api';
import type { GallerySubmission } from '../types';

export async function getGallery(): Promise<GallerySubmission[]> {
  const res = await fetch(`${API_BASE_URL}/gallery`);

  if (!res.ok) {
    throw new Error('Failed to load gallery');
  }

  const json = await res.json();
  return json.data as GallerySubmission[];
}
