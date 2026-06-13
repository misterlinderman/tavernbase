import ShamrockIcon from '../../shared/ShamrockIcon';
import { ContactLink } from '../ContactModal/ContactModalContext';
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

  const linkContent = (
    <>
      {linkTarget}
      <span className={styles.arrow} aria-hidden="true">
        →
      </span>
    </>
  );

  return (
    <div className={styles.bar} role="region" aria-label="Announcement">
      <div className={styles.stripes} aria-hidden="true" />
      <div className={styles.inner}>
        <div className={styles.left}>
          <ShamrockIcon className={styles.icon} />
          <span className={styles.label}>Announcement</span>
          <span className={styles.message}>{message}</span>
        </div>
        {linkTarget === 'Contact' || linkTarget === 'Menu' ? (
          <ContactLink className={styles.link}>{linkContent}</ContactLink>
        ) : (
          <a href={linkTargetToHash(linkTarget)} className={styles.link}>
            {linkContent}
          </a>
        )}
      </div>
    </div>
  );
}

export default AnnouncementBar;
