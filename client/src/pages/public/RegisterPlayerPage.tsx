import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Footer from '../../components/public/Footer';
import Nav from '../../components/public/Nav';
import { useRegisterApi } from '../../hooks/useRegisterApi';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { getPublicRegistration } from '../../services/leaguesPublic';
import {
  getPublicDivisions,
  submitPlayerRegistration,
  type PublicDivisionOption,
} from '../../services/register';
import type { PublicRegistrationInfo } from '../../types/leagues';
import { entryFeeRequiresPayment } from '../../utils/registrationFee';
import homeStyles from './HomePage.module.css';
import styles from './RegisterTeamPage.module.css';

function RegisterPlayerPage() {
  const { leagueId = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const completeStatus = searchParams.get('status');
  const { settings, loading: settingsLoading } = useSiteSettings();
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect, user } = useAuth0();
  const { registerFetch } = useRegisterApi();

  const [registration, setRegistration] = useState<PublicRegistrationInfo | null>(null);
  const [divisions, setDivisions] = useState<PublicDivisionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const userEmail = user?.email?.trim().toLowerCase() ?? '';

  useEffect(() => {
    if (!leagueId) {
      return;
    }

    Promise.all([getPublicRegistration(leagueId), getPublicDivisions(leagueId)])
      .then(([registrationInfo, divisionList]) => {
        setRegistration(registrationInfo);
        setDivisions(divisionList);
        if (divisionList.length === 1) {
          setDivisionId(divisionList[0]._id);
        }
      })
      .catch(() => {
        setRegistration(null);
        setDivisions([]);
      })
      .finally(() => setLoading(false));
  }, [leagueId]);

  useEffect(() => {
    if (user?.name || user?.email) {
      setDisplayName(user.name || user.email?.split('@')[0] || '');
    }
  }, [user?.name, user?.email]);

  const waiverText = useMemo(() => {
    if (registration?.waiverText?.trim()) {
      return registration.waiverText.trim();
    }

    return 'I agree to participate under league rules and venue policies.';
  }, [registration]);

  if (settingsLoading || loading || authLoading) {
    return (
      <div className={homeStyles.loading}>
        <div className={homeStyles.spinner} aria-hidden="true" />
        <p className={homeStyles.loadingText}>Loading…</p>
      </div>
    );
  }

  if (!registration || !registration.isOpen || registration.entrantType !== 'player') {
    return (
      <>
        <Nav />
        <main id="main" className={`section ${styles.main}`}>
          <div className="wrap">
            <p className={styles.empty}>Player registration is not available for this session.</p>
            <Link to={`/register/${leagueId}`} className={styles.backLink}>
              ← Back to league registration
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Nav />
        <main id="main" className={`section ${styles.main}`}>
          <div className="wrap">
            <div className={styles.panel}>
              <h1 className={styles.title}>Register to play</h1>
              <p className={styles.subtitle}>
                Sign in or create a free account to enter this tournament. Use the same email you
                want listed on the bracket.
              </p>
              <button
                type="button"
                className="btn btn-green"
                onClick={() =>
                  loginWithRedirect({
                    authorizationParams: { screen_hint: 'signup' },
                    appState: { returnTo: `/register/${leagueId}/player` },
                  })
                }
              >
                Sign in or create account
              </button>
            </div>
          </div>
        </main>
        {settings ? <Footer settings={settings} /> : null}
      </>
    );
  }

  if (completeStatus) {
    const registrationId = searchParams.get('registration_id') ?? '';
    const isPayment =
      completeStatus === 'pending_payment' &&
      registration &&
      entryFeeRequiresPayment(registration.entryFeeCents);
    const isApproval = completeStatus === 'pending_approval';
    const isWaitlist = completeStatus === 'waitlisted';

    return (
      <>
        <Nav />
        <main id="main" className={`section ${styles.main}`}>
          <div className="wrap">
            <section className={styles.completePanel}>
              <h1 className={styles.completeTitle}>
                {isWaitlist
                  ? 'You are on the waitlist'
                  : isPayment
                    ? 'Almost there'
                    : isApproval
                      ? 'Submitted for review'
                      : 'You are in!'}
              </h1>
              <p className={styles.completeLead}>
                {isWaitlist
                  ? 'This session is full. League staff can promote you if a spot opens up.'
                  : isPayment
                    ? 'Your entry is saved. Complete payment to secure your spot.'
                    : isApproval
                      ? 'A league manager will review your entry before adding you to the bracket.'
                      : completeStatus === 'pending_payment'
                        ? 'Your entry is saved.'
                        : 'You are registered and added to the player list.'}
              </p>
              <div className={styles.completeActions}>
                {isPayment && registrationId ? (
                  <Link
                    to={`/register/payment/cancel?registration_id=${registrationId}`}
                    className="btn btn-green"
                  >
                    Complete payment
                  </Link>
                ) : null}
                <Link to="/register" className="btn btn-outline">
                  Browse registrations
                </Link>
                <Link to="/player" className="btn btn-green">
                  Go to player portal
                </Link>
              </div>
            </section>
          </div>
        </main>
        {settings ? <Footer settings={settings} /> : null}
      </>
    );
  }

  const selectedDivision = divisions.find((division) => division._id === divisionId);

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      setError('Enter the name you want on the bracket');
      return;
    }

    if (divisions.length > 1 && !divisionId) {
      setError('Choose a division');
      return;
    }

    if (!waiverAccepted) {
      setError('Accept the waiver to continue');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await submitPlayerRegistration(registerFetch, leagueId, {
        waiverAccepted: true,
        divisionId: divisionId || undefined,
        displayName: displayName.trim(),
      });

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      const statusParam =
        result.nextStep === 'payment'
          ? 'pending_payment'
          : result.nextStep === 'approval'
            ? 'pending_approval'
            : result.nextStep === 'waitlist'
              ? 'waitlisted'
              : 'approved';

      navigate(`/register/${leagueId}/player?status=${statusParam}`, { replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Could not submit registration'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Nav />
      <main id="main" className={`section ${styles.main}`}>
        <div className="wrap">
          <Link to={`/register/${leagueId}`} className={styles.backLink}>
            ← Back to league overview
          </Link>

          <header className={styles.header}>
            <h1 className={styles.title}>Register for {registration.leagueName}</h1>
            <p className={styles.subtitle}>
              Confirm your details, accept the waiver, and submit your entry.
            </p>
          </header>

          <section className={styles.panel}>
            {error ? <p className={styles.error}>{error}</p> : null}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="player-name">
                Name on bracket
              </label>
              <input
                id="player-name"
                className={styles.input}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={120}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="player-email">
                Email
              </label>
              <input
                id="player-email"
                className={styles.input}
                value={userEmail}
                readOnly
                aria-readonly="true"
              />
            </div>

            {divisions.length > 1 ? (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="division">
                  Division
                </label>
                <select
                  id="division"
                  className={styles.select}
                  value={divisionId}
                  onChange={(event) => setDivisionId(event.target.value)}
                >
                  <option value="">Choose a division</option>
                  {divisions.map((division) => (
                    <option key={division._id} value={division._id}>
                      {division.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : selectedDivision ? (
              <p className={styles.subtitle}>Division: {selectedDivision.name}</p>
            ) : null}

            <dl className={styles.summaryGrid}>
              <div>
                <dt>Entry fee</dt>
                <dd>{registration.entryFeeDisplay}</dd>
              </div>
            </dl>

            <div className={styles.waiverBox}>{waiverText}</div>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={waiverAccepted}
                onChange={(event) => setWaiverAccepted(event.target.checked)}
              />
              <span>I agree to the waiver above</span>
            </label>

            <div className={styles.actions}>
              <button
                type="button"
                className="btn btn-green"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit registration'}
              </button>
            </div>
          </section>
        </div>
      </main>
      {settings ? <Footer settings={settings} /> : null}
    </>
  );
}

export default RegisterPlayerPage;
