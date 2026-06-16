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
  submitTeamRegistration,
  type PublicDivisionOption,
  type TeamRegistrationRosterEntry,
} from '../../services/register';
import type { PublicRegistrationInfo } from '../../types/leagues';
import { entryFeeRequiresPayment } from '../../utils/registrationFee';
import homeStyles from './HomePage.module.css';
import styles from './RegisterTeamPage.module.css';

const DEFAULT_ROSTER_MIN = 3;
const STEPS = ['Team name', 'Roster', 'Waiver', 'Review'] as const;

function emptyRosterRow(): TeamRegistrationRosterEntry {
  return { name: '', email: '' };
}

function RegisterTeamPage() {
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
  const [step, setStep] = useState(0);
  const [teamName, setTeamName] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [roster, setRoster] = useState<TeamRegistrationRosterEntry[]>(() =>
    Array.from({ length: DEFAULT_ROSTER_MIN }, emptyRosterRow)
  );
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
    if (!userEmail) {
      return;
    }

    setRoster((current) => {
      const captainIndex = current.findIndex(
        (entry) => entry.email.trim().toLowerCase() === userEmail
      );

      if (captainIndex >= 0) {
        const next = [...current];
        next[captainIndex] = {
          name: next[captainIndex].name || user?.name || '',
          email: userEmail,
        };
        return next;
      }

      const next = [...current];
      next[0] = {
        name: user?.name || next[0].name,
        email: userEmail,
      };
      return next;
    });
  }, [userEmail, user?.name]);

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

  if (!registration || !registration.isOpen || registration.entrantType === 'player') {
    return (
      <>
        <Nav />
        <main id="main" className={`section ${styles.main}`}>
          <div className="wrap">
            <p className={styles.empty}>Team registration is not available for this session.</p>
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
              <h1 className={styles.title}>Register your team</h1>
              <p className={styles.subtitle}>
                Sign in or create a free account to continue. Use the same email you want on the
                team roster.
              </p>
              <button
                type="button"
                className="btn btn-green"
                onClick={() =>
                  loginWithRedirect({
                    authorizationParams: { screen_hint: 'signup' },
                    appState: { returnTo: `/register/${leagueId}/team` },
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
      completeStatus === 'pending_payment' && registration && entryFeeRequiresPayment(registration.entryFeeCents);
    const isApproval = completeStatus === 'pending_approval';
    const teamLabel = searchParams.get('team') ?? 'your team';

    return (
      <>
        <Nav />
        <main id="main" className={`section ${styles.main}`}>
          <div className="wrap">
            <section className={styles.completePanel}>
              <h1 className={styles.completeTitle}>
                {isPayment ? 'Almost there' : isApproval ? 'Submitted for review' : 'You are in!'}
              </h1>
              <p className={styles.completeLead}>
                {isPayment
                  ? `${teamLabel} is registered. Complete payment to secure your spot.`
                  : isApproval
                    ? `${teamLabel} was submitted. A league manager will review your roster before adding you to the schedule.`
                    : completeStatus === 'pending_payment'
                      ? `${teamLabel} is registered.`
                      : `${teamLabel} is registered and added to the league.`}
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
                <Link to="/captain" className="btn btn-green">
                  Go to captain portal
                </Link>
              </div>
            </section>
          </div>
        </main>
        {settings ? <Footer settings={settings} /> : null}
      </>
    );
  }

  const updateRosterRow = (index: number, field: keyof TeamRegistrationRosterEntry, value: string) => {
    setRoster((current) =>
      current.map((entry, rowIndex) =>
        rowIndex === index ? { ...entry, [field]: value } : entry
      )
    );
  };

  const addRosterRow = () => {
    setRoster((current) => [...current, emptyRosterRow()]);
  };

  const removeRosterRow = (index: number) => {
    setRoster((current) => (current.length <= DEFAULT_ROSTER_MIN ? current : current.filter((_, i) => i !== index)));
  };

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!teamName.trim()) {
        return 'Enter a team name';
      }

      if (divisions.length > 1 && !divisionId) {
        return 'Choose a division';
      }
    }

    if (step === 1) {
      if (roster.length < DEFAULT_ROSTER_MIN) {
        return `Teams need at least ${DEFAULT_ROSTER_MIN} players`;
      }

      for (const entry of roster) {
        if (!entry.name.trim() || !entry.email.trim().includes('@')) {
          return 'Every roster row needs a name and valid email';
        }
      }

      if (!roster.some((entry) => entry.email.trim().toLowerCase() === userEmail)) {
        return 'Include your sign-in email on the roster';
      }
    }

    if (step === 2 && !waiverAccepted) {
      return 'Accept the waiver to continue';
    }

    return null;
  };

  const goNext = () => {
    const message = validateStep();

    if (message) {
      setError(message);
      return;
    }

    setError('');
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError('');
    setStep((current) => Math.max(current - 1, 0));
  };

  const handleSubmit = async () => {
    const message = validateStep();

    if (message) {
      setError(message);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await submitTeamRegistration(registerFetch, leagueId, {
        divisionId: divisionId || undefined,
        teamName: teamName.trim(),
        roster: roster.map((entry) => ({
          name: entry.name.trim(),
          email: entry.email.trim().toLowerCase(),
        })),
        waiverAccepted: true,
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
            : 'approved';

      navigate(
        `/register/${leagueId}/team?status=${statusParam}&team=${encodeURIComponent(result.teamName)}`,
        { replace: true }
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit registration');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDivision = divisions.find((division) => division._id === divisionId);

  return (
    <>
      <Nav />
      <main id="main" className={`section ${styles.main}`}>
        <div className="wrap">
          <Link to={`/register/${leagueId}`} className={styles.backLink}>
            ← Back to league overview
          </Link>

          <header className={styles.header}>
            <h1 className={styles.title}>Register {registration.leagueName}</h1>
            <p className={styles.subtitle}>
              Step {step + 1} of {STEPS.length} · {STEPS[step]}
            </p>
          </header>

          <div className={styles.steps} aria-label="Registration steps">
            {STEPS.map((label, index) => (
              <span
                key={label}
                className={index === step ? styles.stepActive : styles.step}
              >
                {index + 1}. {label}
              </span>
            ))}
          </div>

          <section className={styles.panel}>
            {error ? <p className={styles.error}>{error}</p> : null}

            {step === 0 ? (
              <>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="team-name">
                    Team name
                  </label>
                  <input
                    id="team-name"
                    className={styles.input}
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                    placeholder="e.g. Corner Pocket Crew"
                    maxLength={120}
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
              </>
            ) : null}

            {step === 1 ? (
              <>
                <p className={styles.subtitle}>
                  Add at least {DEFAULT_ROSTER_MIN} players. Use the same email you signed in with
                  for yourself.
                </p>
                <ul className={styles.rosterList}>
                  {roster.map((entry, index) => (
                    <li key={index} className={styles.rosterRow}>
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor={`roster-name-${index}`}>
                          Name
                        </label>
                        <input
                          id={`roster-name-${index}`}
                          className={styles.input}
                          value={entry.name}
                          onChange={(event) => updateRosterRow(index, 'name', event.target.value)}
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor={`roster-email-${index}`}>
                          Email
                        </label>
                        <input
                          id={`roster-email-${index}`}
                          className={styles.input}
                          type="email"
                          value={entry.email}
                          onChange={(event) => updateRosterRow(index, 'email', event.target.value)}
                        />
                      </div>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.removeBtn}
                          onClick={() => removeRosterRow(index)}
                          disabled={roster.length <= DEFAULT_ROSTER_MIN}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <button type="button" className={`btn btn-outline ${styles.addBtn}`} onClick={addRosterRow}>
                  Add player
                </button>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <div className={styles.waiverBox}>{waiverText}</div>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={waiverAccepted}
                    onChange={(event) => setWaiverAccepted(event.target.checked)}
                  />
                  <span>I agree to the waiver above</span>
                </label>
              </>
            ) : null}

            {step === 3 ? (
              <ul className={styles.reviewList}>
                <li>
                  <span className={styles.reviewLabel}>Team</span>
                  {teamName.trim()}
                </li>
                {selectedDivision ? (
                  <li>
                    <span className={styles.reviewLabel}>Division</span>
                    {selectedDivision.name}
                  </li>
                ) : null}
                <li>
                  <span className={styles.reviewLabel}>Entry fee</span>
                  {registration.entryFeeDisplay}
                </li>
                <li>
                  <span className={styles.reviewLabel}>Roster</span>
                  {roster.map((entry) => `${entry.name.trim()} (${entry.email.trim()})`).join(' · ')}
                </li>
              </ul>
            ) : null}

            <div className={styles.actions}>
              {step > 0 ? (
                <button type="button" className="btn btn-outline" onClick={goBack} disabled={submitting}>
                  Back
                </button>
              ) : null}
              {step < STEPS.length - 1 ? (
                <button type="button" className="btn btn-green" onClick={goNext}>
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-green"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting…' : 'Submit registration'}
                </button>
              )}
            </div>
          </section>
        </div>
      </main>
      {settings ? <Footer settings={settings} /> : null}
    </>
  );
}

export default RegisterTeamPage;
