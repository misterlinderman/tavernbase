import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Footer from '../../components/public/Footer';
import Nav from '../../components/public/Nav';
import { useRegisterApi } from '../../hooks/useRegisterApi';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { retryRegistrationCheckout } from '../../services/register';
import styles from './RegisterPaymentPage.module.css';

function RegisterPaymentCancelPage() {
  const [searchParams] = useSearchParams();
  const registrationId = searchParams.get('registration_id') ?? '';
  const { settings, loading: settingsLoading } = useSiteSettings();
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect } = useAuth0();
  const { registerFetch } = useRegisterApi();
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState('');

  const handleRetry = async () => {
    if (!registrationId) {
      return;
    }

    setRetrying(true);
    setError('');

    try {
      const result = await retryRegistrationCheckout(registerFetch, registrationId);
      window.location.href = result.checkoutUrl;
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : 'Could not start checkout');
      setRetrying(false);
    }
  };

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
              <h1 className={styles.title}>Checkout canceled</h1>
              <p className={styles.lead}>Your registration is saved. Browse open leagues to continue.</p>
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
              <h1 className={styles.title}>Sign in to pay</h1>
              <p className={styles.lead}>
                Your registration is saved. Sign in to retry payment when you are ready.
              </p>
              <div className={styles.actions}>
                <button
                  type="button"
                  className="btn btn-green"
                  onClick={() =>
                    loginWithRedirect({
                      appState: {
                        returnTo: `/register/payment/cancel?registration_id=${registrationId}`,
                      },
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
            <h1 className={styles.title}>Payment not completed</h1>
            <p className={styles.lead}>
              Your registration is saved and still awaiting payment. You can retry checkout now or come
              back later.
            </p>
            {error ? <p className={styles.error}>{error}</p> : null}
            <div className={styles.actions}>
              <button
                type="button"
                className="btn btn-green"
                onClick={() => void handleRetry()}
                disabled={retrying}
              >
                {retrying ? 'Starting checkout…' : 'Retry payment'}
              </button>
              <Link to="/register" className="btn btn-outline">
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

export default RegisterPaymentCancelPage;
