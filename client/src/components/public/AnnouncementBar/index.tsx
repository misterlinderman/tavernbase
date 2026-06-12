import ShamrockIcon from '../../shared/ShamrockIcon';
import styles from './AnnouncementBar.module.css';

export interface AnnouncementBarProps {
  enabled: boolean;
  message: string;
  linkTarget: string;
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
          <ShamrockIcon className={styles.icon} />
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
