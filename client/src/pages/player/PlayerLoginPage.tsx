import { Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { BRAND_ASSETS } from '../../constants/brandAssets';
import styles from '../admin/LoginPage.module.css';

function PlayerLoginPage() {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.spinner} aria-hidden="true" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/player" replace />;
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
        <h1 className={styles.title}>Player Login</h1>
        <p className={styles.lead}>
          Use the email address on your league roster. View standings for every league you play in.
        </p>
        <button
          type="button"
          className={`btn btn-green ${styles.signIn}`}
          onClick={() =>
            loginWithRedirect({
              appState: { returnTo: '/player' },
            })
          }
        >
          Sign in with Auth0
        </button>
      </div>
    </div>
  );
}

export default PlayerLoginPage;
