import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Footer from '../../components/public/Footer';
import Nav from '../../components/public/Nav';
import { useRegisterApi } from '../../hooks/useRegisterApi';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { getRegistrationStatus, type RegistrationStatusResult } from '../../services/register';
import styles from './RegisterPaymentPage.module.css';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30;

function buildCompletePath(result: RegistrationStatusResult): string {
  const status = result.status;
  const registrationParam = `&registration_id=${encodeURIComponent(result.registrationId)}`;

  if (result.entrantType === 'team') {
    const teamParam = result.teamName ? `&team=${encodeURIComponent(result.teamName)}` : '';
    return `/register/${result.leagueId}/team?status=${status}${teamParam}${registrationParam}`;
  }

  return `/register/${result.leagueId}/player?status=${status}${registrationParam}`;
}

function RegisterPaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const registrationId = searchParams.get('registration_id') ?? '';
  const { settings, loading: settingsLoading } = useSiteSettings();
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect } = useAuth0();
  const { registerFetch } = useRegisterApi();
  const [message, setMessage] = useState('Confirming your payment…');
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !isAuthenticated || !registrationId) {
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;

      try {
        const result = await getRegistrationStatus(registerFetch, registrationId);

        if (cancelled) {
          return;
        }

        if (result.nextStep !== 'payment') {
          navigate(buildCompletePath(result), { replace: true });
          return;
        }

        if (result.paymentStatus === 'paid' && attempts >= MAX_POLL_ATTEMPTS) {
          setMessage(
            'Payment received. League staff will confirm your registration shortly — refresh this page in a moment.'
          );
          return;
        }

        if (attempts >= MAX_POLL_ATTEMPTS) {
          setMessage(
            'Payment is still processing. If you completed checkout, refresh in a moment or contact league staff.'
          );
          return;
        }

        window.setTimeout(poll, POLL_INTERVAL_MS);
      } catch (pollError) {
        if (cancelled) {
          return;
        }

        setError(
          pollError instanceof Error ? pollError.message : 'Could not confirm payment status'
        );
      }
    };

    void poll();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, navigate, registerFetch, registrationId]);

  if (settingsLoading || authLoading) {
    return null;
  }

  if (!registrationId) {
    return (
      <>
        <Nav />
        <main id="main" className={`section ${styles.main}`}>
          <div className="wrap">
            <section className={styles.panel}>
              <h1 className={styles.title}>Missing registration</h1>
              <p className={styles.lead}>Return to registration and try again.</p>
              <div className={styles.actions}>
                <Link to="/register" className="btn btn-green">
                  Browse registrations
                </Link>
              </div>
            </section>
          </div>
        </main>
        {settings ? <Footer settings={settings} /> : null}
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Nav />
        <main id="main" className={`section ${styles.main}`}>
          <div className="wrap">
            <section className={styles.panel}>
              <h1 className={styles.title}>Sign in to continue</h1>
              <p className={styles.lead}>
                Sign in with the same account you used to register so we can confirm your payment.
              </p>
              <div className={styles.actions}>
                <button
                  type="button"
                  className="btn btn-green"
                  onClick={() =>
                    loginWithRedirect({
                      appState: { returnTo: `/register/payment/success?registration_id=${registrationId}` },
                    })
                  }
                >
                  Sign in
                </button>
              </div>
            </section>
          </div>
        </main>
        {settings ? <Footer settings={settings} /> : null}
      </>
    );
  }

  return (
    <>
      <Nav />
      <main id="main" className={`section ${styles.main}`}>
        <div className="wrap">
          <section className={styles.panel}>
            {error ? <p className={styles.error}>{error}</p> : <div className={styles.spinner} aria-hidden />}
            <h1 className={styles.title}>Payment received</h1>
            <p className={styles.lead}>{message}</p>
            {!error ? null : (
              <div className={styles.actions}>
                <Link to="/register" className="btn btn-outline">
                  Browse registrations
                </Link>
              </div>
            )}
          </section>
        </div>
      </main>
      {settings ? <Footer settings={settings} /> : null}
    </>
  );
}

export default RegisterPaymentSuccessPage;
