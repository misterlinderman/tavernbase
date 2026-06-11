import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Sidebar from '../Sidebar';
import { useAdminApi } from '../../../hooks/useAdminApi';
import styles from './AdminLayout.module.css';

interface OverviewStats {
  pendingSubmissions: number;
}

function AdminLayout() {
  const { isAuthenticated, isLoading } = useAuth0();
  const { adminFetch } = useAdminApi();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadPendingCount = () => {
      adminFetch<OverviewStats>('/admin/overview')
        .then((data) => setPendingCount(data.pendingSubmissions))
        .catch(() => setPendingCount(0));
    };

    loadPendingCount();
    const interval = window.setInterval(loadPendingCount, 60_000);

    return () => window.clearInterval(interval);
  }, [isAuthenticated, adminFetch]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} aria-hidden="true" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className={styles.layout}>
      <Sidebar pendingCount={pendingCount} />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
