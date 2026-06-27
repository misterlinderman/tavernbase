import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { BRAND_ASSETS } from '../../../constants/brandAssets';
import { useCaptainApi } from '../../../hooks/useCaptainApi';
import { getCaptainProfile, activateCaptainAccount } from '../../../services/captain';
import type { CaptainProfile } from '../../../types/captain';
import layoutStyles from '../CaptainLayout.module.css';
import sidebarStyles from '../CaptainSidebar.module.css';

function CaptainLayout() {
  const { isAuthenticated, isLoading, logout } = useAuth0();
  const { captainFetch } = useCaptainApi();
  const [profile, setProfile] = useState<CaptainProfile | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setChecking(false);
      return;
    }

    activateCaptainAccount(captainFetch)
      .catch(() => undefined)
      .then(() => getCaptainProfile(captainFetch))
      .then(setProfile)
      .catch(() => setAccessDenied(true))
      .finally(() => setChecking(false));
  }, [isAuthenticated, captainFetch]);

  if (isLoading || checking) {
    return (
      <div className={layoutStyles.loading}>
        <div className={layoutStyles.spinner} aria-hidden="true" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/captain/login" replace />;
  }

  if (accessDenied) {
    return (
      <div className={layoutStyles.main}>
        <h1>Captain access only</h1>
        <p>This account is not linked to a team captain profile. Sign in with the email your league manager invited, or contact league staff.</p>
      </div>
    );
  }

  return (
    <div className={layoutStyles.layout}>
      <aside className={sidebarStyles.sidebar}>
        <div>
          <img
            src={BRAND_ASSETS.headerLogo}
            alt="Your Tavern"
            width={180}
            height={56}
          />
          <p className={sidebarStyles.brandSub}>Captain Portal</p>
        </div>

        {profile ? (
          <div className={sidebarStyles.profile}>
            <strong>{profile.playerName}</strong>
            <span>
              {profile.teams.length} active team{profile.teams.length === 1 ? '' : 's'}
              {profile.pastTeams.length > 0
                ? ` · ${profile.pastTeams.length} past`
                : ''}
            </span>
          </div>
        ) : null}

        <nav className={sidebarStyles.nav}>
          <NavLink
            to="/captain"
            end
            className={({ isActive }) =>
              isActive
                ? `${sidebarStyles.navLink} ${sidebarStyles.navLinkActive}`
                : sidebarStyles.navLink
            }
          >
            Submit scores
          </NavLink>
          <NavLink
            to="/captain/teams"
            className={({ isActive }) =>
              isActive
                ? `${sidebarStyles.navLink} ${sidebarStyles.navLinkActive}`
                : sidebarStyles.navLink
            }
          >
            My teams
          </NavLink>
        </nav>

        <button
          type="button"
          className={sidebarStyles.logout}
          onClick={() =>
            logout({
              logoutParams: { returnTo: window.location.origin },
            })
          }
        >
          Log out
        </button>
      </aside>
      <main className={layoutStyles.main}>
        <Outlet context={profile} />
      </main>
    </div>
  );
}

export default CaptainLayout;
