import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Sidebar from '../Sidebar';
import { useAdminApi } from '../../../hooks/useAdminApi';
import { useStaffProfile } from '../../../hooks/useStaffProfile';
import styles from './AdminLayout.module.css';

interface OverviewStats {
  pendingSubmissions: number;
}

function isLeagueAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/leagues');
}

function AdminLayout() {
  const { isAuthenticated, isLoading } = useAuth0();
  const { adminFetch } = useAdminApi();
  const { role, loading: profileLoading, isLeagueAdminOnly } = useStaffProfile();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || isLeagueAdminOnly) return;

    const loadPendingCount = () => {
      adminFetch<OverviewStats>('/admin/overview')
        .then((data) => setPendingCount(data.pendingSubmissions))
        .catch(() => setPendingCount(0));
    };

    loadPendingCount();
    const interval = window.setInterval(loadPendingCount, 60_000);

    return () => window.clearInterval(interval);
  }, [adminFetch, isAuthenticated, isLeagueAdminOnly]);

  if (isLoading || profileLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} aria-hidden="true" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!profileLoading && !role) {
    return (
      <div className={styles.loading}>
        <h1>Staff access only</h1>
        <p>
          This login is for dashboard staff. League players should use{' '}
          <a href="/player/login">/player/login</a> and captains should use{' '}
          <a href="/captain/login">/captain/login</a>.
        </p>
      </div>
    );
  }

  if (isLeagueAdminOnly && !isLeagueAdminPath(location.pathname)) {
    return <Navigate to="/admin/leagues" replace />;
  }

  return (
    <div className={styles.layout}>
      <Sidebar pendingCount={pendingCount} role={role} />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
