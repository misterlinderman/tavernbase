import { Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { BRAND_ASSETS } from '../../constants/brandAssets';
import styles from '../admin/LoginPage.module.css';

function CaptainLoginPage() {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.spinner} aria-hidden="true" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/captain" replace />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <img
          src={BRAND_ASSETS.headerLogo}
          alt="Barry O's Old Market Tavern"
          className={styles.logo}
          width={240}
          height={80}
        />
        <h1 className={styles.title}>Captain Login</h1>
        <p className={styles.lead}>
          Use the email address your league manager invited. Sign in to submit match scoresheets for
          your team.
        </p>
        <button
          type="button"
          className={`btn btn-green ${styles.signIn}`}
          onClick={() =>
            loginWithRedirect({
              appState: { returnTo: '/captain' },
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
