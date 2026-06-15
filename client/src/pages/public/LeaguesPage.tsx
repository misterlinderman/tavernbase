import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/public/Footer';
import LeaguesEmptyPanel from '../../components/public/LeaguesEmptyPanel';
import Nav from '../../components/public/Nav';
import {
  FORMAT_LABELS,
  SPORT_LABELS,
  SPORTS,
  STATUS_LABELS,
  type Sport,
} from '../../constants/leagues';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { getPublicLeagues, type PublicLeague } from '../../services/leaguesPublic';
import homeStyles from './HomePage.module.css';
import styles from './LeaguesPage.module.css';

function formatSeasonRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };
  return `${startDate.toLocaleDateString('en-US', opts)} – ${endDate.toLocaleDateString('en-US', opts)}`;
}

function LeaguesPage() {
  const { settings, loading: settingsLoading } = useSiteSettings();
  const [leagues, setLeagues] = useState<PublicLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState<Sport | 'all'>('all');

  const enabledSports = useMemo(() => {
    if (!settings?.sportsEnabled) return [];
    return SPORTS.filter((sport) => settings.sportsEnabled[sport]);
  }, [settings]);

  useEffect(() => {
    getPublicLeagues()
      .then(setLeagues)
      .catch(() => setLeagues([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredLeagues = useMemo(() => {
    if (sportFilter === 'all') return leagues;
    return leagues.filter((league) => league.sport === sportFilter);
  }, [leagues, sportFilter]);

  const visibleSports = useMemo(() => {
    const sportsInLeagues = new Set(leagues.map((league) => league.sport));
    return enabledSports.filter((sport) => sportsInLeagues.has(sport));
  }, [enabledSports, leagues]);

  if (settingsLoading) {
    return (
      <div className={homeStyles.loading}>
        <div className={homeStyles.spinner} aria-hidden="true" />
        <p className={homeStyles.loadingText}>Loading…</p>
      </div>
    );
  }

  const leaguesEnabled = enabledSports.length > 0;

  return (
    <>
      <Nav />
      <main id="main" className={`section ${styles.main}`}>
        <div className="wrap">
          <header className={styles.header}>
            <Link to="/" className={styles.backLink}>
              ← Back to Home
            </Link>
            <h1 className={styles.title}>Leagues</h1>
            <p className={styles.subtitle}>
              Season leagues and knockout tournaments for pool, darts, and volleyball.
            </p>
          </header>

          {!leaguesEnabled ? (
            <LeaguesEmptyPanel />
          ) : loading ? (
            <div className={styles.skeletonList}>
              {[0, 1, 2].map((key) => (
                <div key={key} className={`${styles.skeletonRow} skeletonPulse`} />
              ))}
            </div>
          ) : filteredLeagues.length === 0 ? (
            <LeaguesEmptyPanel />
          ) : (
            <>
              {visibleSports.length > 1 ? (
                <div className={styles.sportTabs} role="tablist" aria-label="Sport filter">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={sportFilter === 'all'}
                    className={sportFilter === 'all' ? styles.sportTabActive : styles.sportTab}
                    onClick={() => setSportFilter('all')}
                  >
                    All
                  </button>
                  {visibleSports.map((sport) => (
                    <button
                      key={sport}
                      type="button"
                      role="tab"
                      aria-selected={sportFilter === sport}
                      className={sportFilter === sport ? styles.sportTabActive : styles.sportTab}
                      onClick={() => setSportFilter(sport)}
                    >
                      {SPORT_LABELS[sport]}
                    </button>
                  ))}
                </div>
              ) : null}

              <ul className={styles.leagueList}>
                {filteredLeagues.map((league) => (
                  <li key={league._id}>
                    <Link to={`/leagues/${league._id}`} className={styles.leagueCard}>
                      <p className={styles.leagueSport}>
                        {SPORT_LABELS[league.sport]}
                        {league.kind === 'tournament' ? (
                          <span className={styles.tournamentBadge}>Tournament</span>
                        ) : null}
                      </p>
                      <h2 className={styles.leagueName}>{league.name}</h2>
                      <p className={styles.leagueMeta}>
                        {formatSeasonRange(league.seasonStart, league.seasonEnd)} ·{' '}
                        {FORMAT_LABELS[league.format]} · {STATUS_LABELS[league.status]}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </main>
      {settings ? <Footer settings={settings} /> : null}
    </>
  );
}

export default LeaguesPage;
