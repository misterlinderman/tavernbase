import { Link } from 'react-router-dom';
import { BRAND_ASSETS } from '../../../constants/brandAssets';
import type { SiteSettings } from '../../../types';
import styles from './FeaturedBanner.module.css';

export interface FeaturedBannerProps {
  featuredBanner: SiteSettings['featuredBanner'];
}

function BannerButton({
  label,
  url,
}: {
  label: string;
  url: string;
}) {
  const trimmed = url.trim();

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return (
      <a
        href={trimmed}
        className={`btn btn-green ${styles.cta}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {label}
      </a>
    );
  }

  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  return (
    <Link to={path} className={`btn btn-green ${styles.cta}`}>
      {label}
    </Link>
  );
}

function FeaturedBanner({ featuredBanner }: FeaturedBannerProps) {
  if (!featuredBanner.enabled) return null;

  const buttonLabel = featuredBanner.buttonLabel.trim() || 'Learn More';

  return (
    <section id="featured" className={styles.section} aria-labelledby="featured-banner-title">
      <div className="wrap">
        <div className={styles.banner}>
          <img
            src={BRAND_ASSETS.footerLogo}
            alt=""
            aria-hidden="true"
            className={styles.watermark}
          />

          <div className={styles.content}>
            <p className={styles.eyebrow}>Featured</p>
            <h2 id="featured-banner-title" className={styles.title}>
              {featuredBanner.title}
            </h2>
            {featuredBanner.subtitle ? (
              <p className={styles.subtitle}>{featuredBanner.subtitle}</p>
            ) : null}
            {featuredBanner.note ? <p className={styles.note}>{featuredBanner.note}</p> : null}
            <BannerButton label={buttonLabel} url={featuredBanner.buttonUrl} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeaturedBanner;
