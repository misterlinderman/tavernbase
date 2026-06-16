import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Footer from '../../components/public/Footer';
import Nav from '../../components/public/Nav';
import {
  ENTRANT_TYPE_LABELS,
  FORMAT_LABELS,
  KIND_LABELS,
  SPORT_LABELS,
} from '../../constants/leagues';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { getPublicLeague, getPublicRegistration, type PublicLeague } from '../../services/leaguesPublic';
import type { PublicRegistrationInfo } from '../../types/leagues';
import homeStyles from './HomePage.module.css';
import styles from './RegisterLeaguePage.module.css';

function formatDateTime(iso?: string): string {
  if (!iso) {
    return 'Not set';
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return 'Not set';
  }

  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatSeasonRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return '';
  }

  return `${startDate.toLocaleDateString('en-US', opts)} – ${endDate.toLocaleDateString('en-US', opts)}`;
}

function eligibilityLines(
  league: PublicLeague,
  registration: PublicRegistrationInfo
): string[] {
  const lines: string[] = [];
  const entrantType = league.entrantType === 'player' ? 'player' : 'team';

  if (entrantType === 'team') {
    lines.push('Team captains register a team name and roster.');
    lines.push('You will need an email address for each player you add.');
  } else {
    lines.push('Individual players register for themselves.');
    lines.push('Use the same email you plan to sign in with.');
  }

  if (registration.entryFeeCents > 0) {
    lines.push(
      `Entry fee is ${registration.entryFeeDisplay} — pay securely via Stripe Checkout after you submit.`
    );
  } else {
    lines.push('There is no entry fee for this session.');
  }

  if (registration.requiresApproval) {
    lines.push('A league manager reviews every signup before you are added to the roster.');
  } else {
    lines.push('Approved signups are added automatically once you complete registration.');
  }

  if (registration.maxEntrants !== undefined && registration.spotsRemaining !== null) {
    lines.push(
      `${registration.spotsRemaining} of ${registration.maxEntrants} ${entrantType === 'player' ? 'player' : 'team'} spots remain.`
    );
  }

  if (registration.closesAt) {
    lines.push(`Registration closes ${formatDateTime(registration.closesAt).toLowerCase()}.`);
  }

  return lines;
}

function RegisterLeaguePage() {
  const { leagueId = '' } = useParams();
  const { settings, loading: settingsLoading } = useSiteSettings();
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect, user } = useAuth0();
  const [league, setLeague] = useState<PublicLeague | null>(null);
  const [registration, setRegistration] = useState<PublicRegistrationInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leagueId) {
      return;
    }

    Promise.all([getPublicLeague(leagueId), getPublicRegistration(leagueId)])
      .then(([leagueDetail, registrationInfo]) => {
        setLeague(leagueDetail);
        setRegistration(registrationInfo);
      })
      .catch(() => {
        setLeague(null);
        setRegistration(null);
      })
      .finally(() => setLoading(false));
  }, [leagueId]);

  if (settingsLoading || loading || authLoading) {
    return (
      <div className={homeStyles.loading}>
        <div className={homeStyles.spinner} aria-hidden="true" />
        <p className={homeStyles.loadingText}>Loading…</p>
      </div>
    );
  }

  if (!league || !registration) {
    return (
      <>
        <Nav />
        <main id="main" className={`section ${styles.main}`}>
          <div className="wrap">
            <p className={styles.empty}>Registration not found.</p>
            <Link to="/register" className={styles.backLink}>
              ← All registrations
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (!registration.isOpen) {
    return (
      <>
        <Nav />
        <main id="main" className={`section ${styles.main}`}>
          <div className="wrap">
            <Link to="/register" className={styles.backLink}>
              ← All registrations
            </Link>
            <section className={styles.closedPanel}>
              <h1 className={styles.title}>{league.name}</h1>
              <p className={styles.lead}>
                Registration is closed for this session — it may be full, past the deadline, or not
                yet open.
              </p>
              <Link to="/register" className="btn btn-outline">
                Browse open registrations
              </Link>
            </section>
          </div>
        </main>
        {settings ? <Footer settings={settings} /> : null}
      </>
    );
  }

  const entrantType = league.entrantType === 'player' ? 'player' : 'team';
  const registerLabel = entrantType === 'player' ? 'Register as player' : 'Register as team';
  const rules = eligibilityLines(league, registration);

  const handleSignIn = () => {
    loginWithRedirect({
      authorizationParams: { screen_hint: 'signup' },
      appState: { returnTo: `/register/${leagueId}` },
    });
  };

  return (
    <>
      <Nav />
      <main id="main" className={`section ${styles.main}`}>
        <div className="wrap">
          <Link to="/register" className={styles.backLink}>
            ← All registrations
          </Link>

          <header className={styles.header}>
            <p className={styles.kicker}>
              {SPORT_LABELS[league.sport]}
              {league.kind === 'tournament' ? ' · Tournament' : ''}
            </p>
            <h1 className={styles.title}>{league.name}</h1>
            <p className={styles.subtitle}>
              {league.kind ? KIND_LABELS[league.kind] : 'Season league'} ·{' '}
              {league.entrantType ? ENTRANT_TYPE_LABELS[league.entrantType] : 'Teams'} ·{' '}
              {FORMAT_LABELS[league.format]} · {formatSeasonRange(league.seasonStart, league.seasonEnd)}
            </p>
          </header>

          <div className={styles.layout}>
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>Before you sign up</h2>
              <ul className={styles.rulesList}>
                {rules.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <dl className={styles.summaryGrid}>
                <div>
                  <dt>Entry fee</dt>
                  <dd>{registration.entryFeeDisplay}</dd>
                </div>
                <div>
                  <dt>Opens</dt>
                  <dd>{formatDateTime(registration.opensAt)}</dd>
                </div>
                <div>
                  <dt>Closes</dt>
                  <dd>{formatDateTime(registration.closesAt)}</dd>
                </div>
              </dl>
            </section>

            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>{registerLabel}</h2>

              {isAuthenticated ? (
                <div className={styles.authPanel}>
                  <p className={styles.lead}>
                    Signed in as {user?.email ?? user?.name ?? 'your account'}.
                  </p>
                  <Link
                    to={
                      entrantType === 'player'
                        ? `/register/${leagueId}/player`
                        : `/register/${leagueId}/team`
                    }
                    className="btn btn-green"
                  >
                    {registerLabel}
                  </Link>
                </div>
              ) : (
                <div className={styles.authPanel}>
                  <p className={styles.lead}>
                    Sign in or create a free account to continue. Use the same email you want on
                    the {entrantType === 'player' ? 'player' : 'team'} roster.
                  </p>
                  <button type="button" className="btn btn-green" onClick={handleSignIn}>
                    Sign in or create account
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
      {settings ? <Footer settings={settings} /> : null}
    </>
  );
}

export default RegisterLeaguePage;
