import { useGallery } from '../../../hooks/useGallery';
import type { GallerySubmission } from '../../../types';
import styles from './Gallery.module.css';

export interface GalleryProps {
  instagramHandle?: string;
  enabled?: boolean;
}

function GallerySkeleton() {
  return (
    <div className={styles.grid} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((key) => (
        <div key={key} className={`${styles.skeletonTile} skeletonPulse`} />
      ))}
    </div>
  );
}

function Gallery({ instagramHandle = '', enabled = true }: GalleryProps) {
  const { photos, loading } = useGallery();

  if (!enabled) {
    return null;
  }

  if (loading) {
    return (
      <section id="gallery" className="section" aria-busy="true">
        <div className="wrap">
          <h2 className="sec-head">From the Pub</h2>
          <p className="sr-only">Loading gallery…</p>
          <GallerySkeleton />
        </div>
      </section>
    );
  }

  if (photos.length === 0) {
    return null;
  }

  const handle = instagramHandle.replace(/^@/, '');
  const instagramUrl = handle ? `https://instagram.com/${handle}` : undefined;

  return (
    <section id="gallery" className="section">
      <div className="wrap">
        <h2 className="sec-head">From the Pub</h2>

        {instagramUrl ? (
          <p className={styles.instagram}>
            Follow us on{' '}
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
              @{handle}
            </a>
          </p>
        ) : null}

        <div className={styles.grid}>
          {photos.map((photo: GallerySubmission) => (
            <figure key={photo._id} className={styles.tile}>
              <img
                src={photo.thumbnailUrl || photo.imageUrl}
                alt={photo.caption || `Photo by ${photo.submitterName}`}
                loading="lazy"
              />
              <figcaption className={styles.overlay}>
                <span className={styles.name}>{photo.submitterName}</span>
                {photo.caption ? <span className={styles.caption}>{photo.caption}</span> : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Gallery;
