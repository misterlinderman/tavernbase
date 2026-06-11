import { Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
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
        <p className={`script ${styles.brand}`}>Barry O&apos;s</p>
        <p className={styles.sub}>Old Market Tavern</p>
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
