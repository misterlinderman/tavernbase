import type { GallerySubmission } from '../types';

const BASE = import.meta.env.VITE_API_URL;

export async function getGallery(): Promise<GallerySubmission[]> {
  const res = await fetch(`${BASE}/gallery`);

  if (!res.ok) {
    throw new Error('Failed to load gallery');
  }

  const json = await res.json();
  return json.data as GallerySubmission[];
}
