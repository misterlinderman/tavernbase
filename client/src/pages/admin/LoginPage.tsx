import { Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { BRAND_ASSETS } from '../../constants/brandAssets';
import styles from './LoginPage.module.css';

function LoginPage() {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.spinner} aria-hidden="true" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
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
        <h1 className={styles.title}>Staff Login</h1>
        <p className={styles.lead}>Sign in to manage site content, events, and submissions.</p>
        <button
          type="button"
          className={`btn btn-green ${styles.signIn}`}
          onClick={() =>
            loginWithRedirect({
              appState: { returnTo: '/admin' },
            })
          }
        >
          Sign in with Auth0
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
