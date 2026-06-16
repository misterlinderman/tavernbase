import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FORMAT_LABELS, SPORT_LABELS } from '../../../constants/leagues';
import { usePublicLeagues } from '../../../hooks/usePublicLeagues';
import { getOpenRegistrations } from '../../../services/leaguesPublic';
import styles from './LeaguesSection.module.css';

function formatSeasonRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return '';
  }

  return `${startDate.toLocaleDateString('en-US', opts)} – ${endDate.toLocaleDateString('en-US', opts)}`;
}

function LeaguesSection() {
  const { leagues, loading } = usePublicLeagues();
  const [hasOpenRegistration, setHasOpenRegistration] = useState(false);

  useEffect(() => {
    getOpenRegistrations()
      .then((listings) => setHasOpenRegistration(listings.length > 0))
      .catch(() => setHasOpenRegistration(false));
  }, []);

  if (loading || leagues.length === 0) {
    return null;
  }

  return (
    <section id="leagues" className="section">
      <div className="wrap">
        <h2 className="sec-head">Leagues &amp; Tournaments</h2>

        <div className={styles.grid}>
          {leagues.map((league) => (
            <Link key={league._id} to={`/leagues/${league._id}`} className={styles.card}>
              <p className={styles.sport}>
                {SPORT_LABELS[league.sport]}
                {league.kind === 'tournament' ? (
                  <span className={styles.tournamentBadge}>Tournament</span>
                ) : null}
              </p>
              <h3 className={styles.name}>{league.name}</h3>
              <p className={styles.meta}>
                {formatSeasonRange(league.seasonStart, league.seasonEnd)}
                {league.format ? ` · ${FORMAT_LABELS[league.format]}` : ''}
              </p>
            </Link>
          ))}
        </div>

        <div className={styles.footer}>
          {hasOpenRegistration ? (
            <Link to="/register" className="btn btn-green">
              Registration open →
            </Link>
          ) : null}
          <Link to="/leagues" className="btn btn-outline">
            All leagues →
          </Link>
        </div>
      </div>
    </section>
  );
}

export default LeaguesSection;
