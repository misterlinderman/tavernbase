import { useCallback, useEffect, useState } from 'react';
import { BRAND_ASSETS } from '../../../constants/brandAssets';
import styles from './Hero.module.css';

export interface HeroProps {
  videoUrl?: string;
  posterUrl?: string;
  headline: string;
  subheadline: string;
}

function Hero({ videoUrl, posterUrl, headline, subheadline }: HeroProps) {
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
        <img
          src={BRAND_ASSETS.heroEst1985}
          alt="Established 1985"
          className={`${styles.eyebrow} ${styles.animate}`}
          style={{ animationDelay: '0.1s' }}
          width={320}
          height={48}
        />

        <h1 className={`${styles.title} ${styles.animate}`} style={{ animationDelay: '0.2s' }}>
          {headline}
        </h1>

        <p className={`${styles.sub} ${styles.animate}`} style={{ animationDelay: '0.3s' }}>
          {subheadline}
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
