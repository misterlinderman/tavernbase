import { useEffect, useState } from 'react';
import { getGallery } from '../services/gallery';
import type { GallerySubmission } from '../types';

export function useGallery() {
  const [photos, setPhotos] = useState<GallerySubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGallery()
      .then(setPhotos)
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, []);

  return { photos, loading };
}
