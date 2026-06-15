import { NavLink } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { BRAND_ASSETS } from '../../../constants/brandAssets';
import type { StaffRole } from '../../../hooks/useStaffProfile';
import styles from './Sidebar.module.css';

export interface SidebarProps {
  pendingCount: number;
  role: StaffRole | null;
}

const ALL_NAV_ITEMS = [
  { path: '/admin', label: 'Overview', end: true, roles: ['manager', 'staff', 'league_admin'] as const },
  { path: '/admin/submissions', label: 'Photo Submissions', badge: true, roles: ['manager', 'staff'] as const },
  { path: '/admin/events', label: 'Events', roles: ['manager', 'staff'] as const },
  { path: '/admin/leagues', label: 'Leagues', roles: ['manager', 'staff', 'league_admin'] as const },
  { path: '/admin/announcement', label: 'Announcement Bar', roles: ['manager', 'staff'] as const },
  { path: '/admin/christmas', label: 'Christmas Party', roles: ['manager', 'staff'] as const },
  { path: '/admin/hours', label: 'Hours & Info', roles: ['manager', 'staff'] as const },
  { path: '/admin/media', label: 'Media & Social', roles: ['manager', 'staff'] as const },
] as const;

function Sidebar({ pendingCount, role }: SidebarProps) {
  const { user, logout } = useAuth0();
  const navItems = ALL_NAV_ITEMS.filter((item) =>
    role ? (item.roles as readonly StaffRole[]).includes(role) : true
  );

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <img
          src={BRAND_ASSETS.headerLogo}
          alt="Barry O's Old Market Tavern"
          className={styles.logo}
          width={200}
          height={64}
        />
        <p className={styles.brandSub}>Staff Dashboard</p>
      </div>

      <nav className={styles.nav} aria-label="Admin navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={'end' in item ? item.end : false}
            className={({ isActive }) =>
              isActive ? `${styles.link} ${styles.active}` : styles.link
            }
          >
            <span>{item.label}</span>
            {'badge' in item && item.badge && pendingCount > 0 ? (
              <span className={styles.badge}>{pendingCount}</span>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        <p className={styles.signedIn}>Signed in as {user?.name ?? user?.email ?? 'Staff'}</p>
        <button
          type="button"
          className={styles.logout}
          onClick={() =>
            logout({
              logoutParams: { returnTo: window.location.origin },
            })
          }
        >
          Log out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
