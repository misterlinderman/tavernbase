import { useEffect, useState } from 'react';
import styles from './Hero.module.css';

export interface HeroProps {
  videoUrl?: string;
  posterUrl?: string;
  headline: string;
  subheadline: string;
  venueName?: string;
}

function Hero({ videoUrl, posterUrl, headline, subheadline, venueName = 'Your Tavern' }: HeroProps) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduceMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  const showVideo = Boolean(videoUrl) && !videoFailed && !reduceMotion;

  return (
    <section className={styles.hero} aria-label={`Welcome to ${venueName}`}>
      <div className={styles.fallback} aria-hidden="true" />

      {showVideo && (
        <video
          className={styles.video}
          src={videoUrl}
          poster={posterUrl}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          onError={() => setVideoFailed(true)}
        />
      )}

      <div className={styles.overlay} aria-hidden="true" />

      <div className={styles.content}>
        <h1 className={`${styles.title} ${styles.animate}`} style={{ animationDelay: '0.1s' }}>
          {headline}
        </h1>

        <p className={`${styles.sub} ${styles.animate}`} style={{ animationDelay: '0.2s' }}>
          {subheadline}
        </p>

        <a
          href="#about"
          className={`btn btn-green ${styles.cta} ${styles.animate}`}
          style={{ animationDelay: '0.3s' }}
        >
          About Us
        </a>
      </div>
    </section>
  );
}

export default Hero;
