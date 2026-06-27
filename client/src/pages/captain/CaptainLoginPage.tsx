import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { BRAND_ASSETS } from '../../constants/brandAssets';
import styles from '../admin/LoginPage.module.css';

function CaptainLoginPage() {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/captain';

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
        <h1 className={styles.title}>Captain Login</h1>
        <p className={styles.lead}>
          Invited captains: sign in with the email your league manager used. Registering a new team
          for an open season? Browse <a href="/register">open registrations</a> — you can create an
          account there and return here after your team is approved.
        </p>
        <button
          type="button"
          className={`btn btn-green ${styles.signIn}`}
          onClick={() =>
            loginWithRedirect({
              appState: { returnTo },
            })
          }
        >
          Sign in with Auth0
        </button>
      </div>
    </div>
  );
}

export default CaptainLoginPage;
