import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { BRAND_ASSETS } from '../../constants/brandAssets';
import styles from '../admin/LoginPage.module.css';

function PlayerLoginPage() {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/player';

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.spinner} aria-hidden="true" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={returnTo} replace />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <img
          src={BRAND_ASSETS.headerLogo}
          alt="Your Tavern"
          className={styles.logo}
          width={240}
          height={80}
        />
        <h1 className={styles.title}>Player Login</h1>
        <p className={styles.lead}>
          Already on a roster? Sign in with the email on your player record. Entering a singles
          tournament? Start at <a href="/register">open registrations</a> — create an account, submit
          your entry, then come back here for standings.
        </p>
        <button
          type="button"
          className={`btn btn-green ${styles.signIn}`}
          onClick={() =>
            loginWithRedirect({
              authorizationParams: { screen_hint: 'signup' },
              appState: { returnTo },
            })
          }
        >
          Sign in or create account
        </button>
      </div>
    </div>
  );
}

export default PlayerLoginPage;
