import { useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { BRAND_ASSETS } from '../../../constants/brandAssets';
import { usePlayerApi } from '../../../hooks/usePlayerApi';
import { activatePlayerAccount, getPlayerProfile } from '../../../services/player';
import type { PlayerProfile } from '../../../types/player';
import layoutStyles from '../../captain/CaptainLayout.module.css';
import sidebarStyles from '../../captain/CaptainSidebar.module.css';

function PlayerLayout() {
  const { isAuthenticated, isLoading, logout } = useAuth0();
  const { playerFetch } = usePlayerApi();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setChecking(false);
      return;
    }

    activatePlayerAccount(playerFetch)
      .catch(() => undefined)
      .then(() => getPlayerProfile(playerFetch))
      .then(setProfile)
      .catch(() => setAccessDenied(true))
      .finally(() => setChecking(false));
  }, [isAuthenticated, playerFetch]);

  const hasIndividualMatches = useMemo(
    () =>
      profile?.leagues.some((league) => (league.entrantDivisions?.length ?? 0) > 0) ?? false,
    [profile]
  );

  if (isLoading || checking) {
    return (
      <div className={layoutStyles.loading}>
        <div className={layoutStyles.spinner} aria-hidden="true" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/player/login" replace />;
  }

  if (accessDenied) {
    return (
      <div className={layoutStyles.main}>
        <h1>Player access only</h1>
        <p>
          This account is not on a league roster. Sign in with the email your league manager added,
          or contact league staff.
        </p>
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
          <p className={sidebarStyles.brandSub}>Player Portal</p>
        </div>

        {profile ? (
          <div className={sidebarStyles.profile}>
            <strong>{profile.playerName}</strong>
            <span>{profile.leagues.length} league{profile.leagues.length === 1 ? '' : 's'}</span>
          </div>
        ) : null}

        <nav className={sidebarStyles.nav}>
          <NavLink
            to="/player"
            end
            className={({ isActive }) =>
              isActive ? `${sidebarStyles.navLink} ${sidebarStyles.navLinkActive}` : sidebarStyles.navLink
            }
          >
            Standings
          </NavLink>
          {hasIndividualMatches ? (
            <NavLink
              to="/player/scores"
              className={({ isActive }) =>
                isActive
                  ? `${sidebarStyles.navLink} ${sidebarStyles.navLinkActive}`
                  : sidebarStyles.navLink
              }
            >
              Submit scores
            </NavLink>
          ) : null}
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

export default PlayerLayout;
