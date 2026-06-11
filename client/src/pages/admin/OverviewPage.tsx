import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminApi } from '../../hooks/useAdminApi';
import type { OverviewStats, PendingSubmission } from '../../types';
import formStyles from '../../components/admin/shared/adminForm.module.css';
import styles from './OverviewPage.module.css';

function formatChristmasLabel(christmas: OverviewStats['christmas']): string {
  if (!christmas.enabled) return 'Off';
  if (christmas.daysUntil === null) return 'On';
  if (christmas.daysUntil === 0) return 'Today';
  if (christmas.daysUntil < 0) return 'Past';
  return `${christmas.daysUntil} days`;
}

function OverviewSkeleton() {
  return (
    <div aria-busy="true">
      <div className={styles.statGrid}>
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className={`${styles.statCard} ${styles.skeletonStat} skeletonPulse`} />
        ))}
      </div>
      <div className={`${formStyles.panel} ${styles.section} ${styles.skeletonPanel} skeletonPulse`} />
      <div className={`${formStyles.panel} ${styles.section} ${styles.skeletonPanel} skeletonPulse`} />
    </div>
  );
}

function OverviewPage() {
  const { adminFetch } = useAdminApi();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [pending, setPending] = useState<PendingSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminFetch<OverviewStats>('/admin/overview'),
      adminFetch<PendingSubmission[]>('/admin/submissions?status=pending'),
    ])
      .then(([overview, submissions]) => {
        setStats(overview);
        setPending(submissions);
      })
      .catch(() => {
        setStats(null);
        setPending([]);
      })
      .finally(() => setLoading(false));
  }, [adminFetch]);

  if (loading) {
    return (
      <div>
        <h1 className={formStyles.pageTitle}>Overview</h1>
        <OverviewSkeleton />
      </div>
    );
  }

  if (!stats) {
    return (
      <div>
        <h1 className={formStyles.pageTitle}>Overview</h1>
        <p className={styles.loading} role="alert">
          Unable to load overview. Try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className={formStyles.pageTitle}>Overview</h1>

      <div className={styles.statGrid}>
        <Link
          to="/admin/submissions"
          className={`${styles.statCard} ${styles.amber} ${stats.pendingSubmissions > 0 ? styles.statAlert : ''}`}
        >
          <span className={styles.statValue}>{stats.pendingSubmissions}</span>
          <span className={styles.statLabel}>Photos to review</span>
        </Link>

        <Link to="/admin/events" className={`${styles.statCard} ${styles.green}`}>
          <span className={styles.statValue}>{stats.upcomingEvents}</span>
          <span className={styles.statLabel}>Upcoming events</span>
        </Link>

        <Link to="/admin/announcement" className={styles.statCard}>
          <span className={styles.statValue}>{stats.announcement.enabled ? 'On' : 'Off'}</span>
          <span className={styles.statLabel}>Announcement bar</span>
        </Link>

        <Link to="/admin/christmas" className={styles.statCard}>
          <span className={styles.statValue}>{formatChristmasLabel(stats.christmas)}</span>
          <span className={styles.statLabel}>Christmas CTA</span>
        </Link>
      </div>

      <section className={`${formStyles.panel} ${styles.section}`}>
        <h2 className={formStyles.sectionTitle}>Needs your attention</h2>
        {pending.length === 0 ? (
          <p className={styles.empty}>Nothing waiting for review right now.</p>
        ) : (
          <ul className={styles.attentionList}>
            {pending.map((item) => (
              <li key={item._id} className={styles.attentionItem}>
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={`Photo from ${item.submitterName}`}
                    className={styles.thumb}
                  />
                ) : (
                  <div className={styles.thumbPlaceholder} />
                )}
                <div className={styles.attentionBody}>
                  <p className={styles.attentionName}>{item.submitterName}</p>
                  <p className={styles.attentionCaption}>{item.caption || 'No caption'}</p>
                </div>
                <Link
                  to="/admin/submissions"
                  className="btn btn-outline"
                  aria-label={`Review photo from ${item.submitterName}`}
                >
                  Review
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${formStyles.panel} ${styles.section}`}>
        <h2 className={formStyles.sectionTitle}>Live on the site</h2>
        <ul className={styles.liveList}>
          <li>
            <span>Announcement bar</span>
            <strong>{stats.announcement.enabled ? 'Showing on site' : 'Hidden'}</strong>
          </li>
          <li>
            <span>Upcoming events</span>
            <strong>{stats.upcomingEvents}</strong>
          </li>
          <li>
            <span>Christmas party CTA</span>
            <strong>{stats.christmas.enabled ? formatChristmasLabel(stats.christmas) : 'Hidden'}</strong>
          </li>
        </ul>
      </section>
    </div>
  );
}

export default OverviewPage;
