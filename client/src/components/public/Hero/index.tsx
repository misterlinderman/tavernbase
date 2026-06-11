import { useCallback, useEffect, useState } from 'react';
import styles from './Hero.module.css';

export interface HeroProps {
  videoUrl?: string;
  posterUrl?: string;
}

function CloverIcon() {
  return (
    <svg
      className={styles.clover}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="4" />
      <circle cx="16" cy="8" r="4" />
      <circle cx="8" cy="16" r="4" />
      <circle cx="16" cy="16" r="4" />
      <circle cx="12" cy="12" r="2.5" fill="var(--bg)" />
    </svg>
  );
}

function Hero({ videoUrl, posterUrl }: HeroProps) {
  const [muted, setMuted] = useState(true);
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

  const toggleMute = useCallback(() => {
    setMuted((prev) => !prev);
  }, []);

  return (
    <section className={styles.hero} aria-label="Welcome to Barry O's Old Market Tavern">
      <div className={styles.fallback} aria-hidden="true" />

      {showVideo && (
        <video
          className={styles.video}
          src={videoUrl}
          poster={posterUrl}
          autoPlay
          muted={muted}
          loop
          playsInline
          aria-hidden="true"
          onError={() => setVideoFailed(true)}
        />
      )}

      <div className={styles.overlay} aria-hidden="true" />

      <div className={styles.content}>
        <p className={`${styles.eyebrow} ${styles.animate}`} style={{ animationDelay: '0.1s' }}>
          <CloverIcon />
          <span>EST ★ 1985</span>
        </p>

        <h1 className={`${styles.title} ${styles.animate}`} style={{ animationDelay: '0.2s' }}>
          A Neighborhood Tradition
        </h1>

        <p className={`${styles.sub} ${styles.animate}`} style={{ animationDelay: '0.3s' }}>
          Old Market Tavern
        </p>

        <a
          href="#about"
          className={`btn btn-green ${styles.cta} ${styles.animate}`}
          style={{ animationDelay: '0.4s' }}
        >
          About Barry O&apos;s
        </a>
      </div>

      {showVideo && (
        <button
          type="button"
          className={styles.unmute}
          onClick={toggleMute}
          aria-label={muted ? 'Unmute hero video' : 'Mute hero video'}
        >
          {muted ? 'Unmute' : 'Mute'}
        </button>
      )}
    </section>
  );
}

export default Hero;
