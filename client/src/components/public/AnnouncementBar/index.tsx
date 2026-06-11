import styles from './AnnouncementBar.module.css';

export interface AnnouncementBarProps {
  enabled: boolean;
  message: string;
  linkTarget: string;
}

function MegaphoneIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 11c0-2.21-1.79-4-4-4V3L8 7v10l6 4v-4c2.21 0 4-1.79 4-4zm-4 2c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1z" />
    </svg>
  );
}

function linkTargetToHash(linkTarget: string): string {
  const anchors: Record<string, string> = {
    Events: 'events',
    'Christmas Party': 'christmas',
    Menu: 'contact',
    Contact: 'contact',
  };

  return `#${anchors[linkTarget] ?? linkTarget.toLowerCase().replace(/\s+/g, '-')}`;
}

function AnnouncementBar({ enabled, message, linkTarget }: AnnouncementBarProps) {
  if (!enabled) return null;

  return (
    <div className={styles.bar} role="region" aria-label="Announcement">
      <div className={styles.stripes} aria-hidden="true" />
      <div className={styles.inner}>
        <div className={styles.left}>
          <MegaphoneIcon />
          <span className={styles.label}>Announcement</span>
          <span className={styles.message}>{message}</span>
        </div>
        <a href={linkTargetToHash(linkTarget)} className={styles.link}>
          {linkTarget}
          <span className={styles.arrow} aria-hidden="true">
            →
          </span>
        </a>
      </div>
    </div>
  );
}

export default AnnouncementBar;
