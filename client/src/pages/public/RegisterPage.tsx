import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/public/Footer';
import Nav from '../../components/public/Nav';
import RegistrationEmptyPanel from '../../components/public/RegistrationEmptyPanel';
import {
  ENTRANT_TYPE_LABELS,
  FORMAT_LABELS,
  KIND_LABELS,
  SPORT_LABELS,
  SPORTS,
  type Sport,
} from '../../constants/leagues';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { getOpenRegistrations } from '../../services/leaguesPublic';
import type { OpenRegistrationListing } from '../../types/leagues';
import homeStyles from './HomePage.module.css';
import styles from './RegisterPage.module.css';

function formatClosesDate(iso?: string): string {
  if (!iso) {
    return 'Open until filled';
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return 'Open until filled';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatSeasonRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return '';
  }

  return `${startDate.toLocaleDateString('en-US', opts)} – ${endDate.toLocaleDateString('en-US', opts)}`;
}

function spotsLabel(listing: OpenRegistrationListing): string {
  if (listing.spotsRemaining === null) {
    return 'Open spots';
  }

  if (listing.spotsRemaining === 0) {
    return 'Full';
  }

  const unit = listing.entrantType === 'player' ? 'player' : 'team';
  return `${listing.spotsRemaining} ${unit}${listing.spotsRemaining === 1 ? '' : 's'} left`;
}

function RegisterPage() {
  const { settings, loading: settingsLoading } = useSiteSettings();
  const [listings, setListings] = useState<OpenRegistrationListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState<Sport | 'all'>('all');

  const enabledSports = useMemo(() => {
    if (!settings?.sportsEnabled) {
      return [];
    }

    return SPORTS.filter((sport) => settings.sportsEnabled[sport]);
  }, [settings]);

  useEffect(() => {
    getOpenRegistrations()
      .then(setListings)
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredListings = useMemo(() => {
    if (sportFilter === 'all') {
      return listings;
    }

    return listings.filter((listing) => listing.sport === sportFilter);
  }, [listings, sportFilter]);

  const visibleSports = useMemo(() => {
    const sportsInListings = new Set(listings.map((listing) => listing.sport));
    return enabledSports.filter((sport) => sportsInListings.has(sport));
  }, [enabledSports, listings]);

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
            <h1 className={styles.title}>Register</h1>
            <p className={styles.subtitle}>
              Sign up for open league and tournament sessions. Create an account when you are ready
              — no staff login required to browse.
            </p>
          </header>

          {!leaguesEnabled ? (
            <RegistrationEmptyPanel />
          ) : loading ? (
            <div className={styles.skeletonList}>
              {[0, 1, 2].map((key) => (
                <div key={key} className={`${styles.skeletonRow} skeletonPulse`} />
              ))}
            </div>
          ) : filteredListings.length === 0 ? (
            <RegistrationEmptyPanel />
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

              <ul className={styles.cardList}>
                {filteredListings.map((listing) => {
                  const entrantType = listing.entrantType === 'player' ? 'player' : 'team';
                  const registerLabel =
                    entrantType === 'player' ? 'Register as player' : 'Register as team';

                  return (
                    <li key={listing.leagueId} className={styles.card}>
                      <div className={styles.cardBody}>
                        <p className={styles.cardSport}>
                          {SPORT_LABELS[listing.sport]}
                          {listing.kind === 'tournament' ? (
                            <span className={styles.tournamentBadge}>Tournament</span>
                          ) : null}
                        </p>
                        <h2 className={styles.cardName}>{listing.leagueName}</h2>
                        <p className={styles.cardMeta}>
                          {listing.kind ? KIND_LABELS[listing.kind] : 'Season league'} ·{' '}
                          {listing.entrantType
                            ? ENTRANT_TYPE_LABELS[listing.entrantType]
                            : 'Teams'}{' '}
                          · {FORMAT_LABELS[listing.format]}
                        </p>
                        <p className={styles.cardMeta}>
                          {formatSeasonRange(listing.seasonStart, listing.seasonEnd)}
                        </p>
                        <dl className={styles.details}>
                          <div>
                            <dt>Entry fee</dt>
                            <dd>{listing.entryFeeDisplay}</dd>
                          </div>
                          <div>
                            <dt>Spots</dt>
                            <dd>{spotsLabel(listing)}</dd>
                          </div>
                          <div>
                            <dt>Closes</dt>
                            <dd>{formatClosesDate(listing.closesAt)}</dd>
                          </div>
                        </dl>
                      </div>
                      <div className={styles.cardActions}>
                        <Link
                          to={`/register/${listing.leagueId}`}
                          className="btn btn-green"
                        >
                          {registerLabel}
                        </Link>
                        <Link to={`/leagues/${listing.leagueId}`} className="btn btn-outline">
                          View league
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </main>
      {settings ? <Footer settings={settings} /> : null}
    </>
  );
}

export default RegisterPage;
