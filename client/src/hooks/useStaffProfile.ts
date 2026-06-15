import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '../config/api';

export type StaffRole = 'manager' | 'staff' | 'league_admin';

export interface StaffProfile {
  name: string;
  email: string;
  role: StaffRole;
}

export function useStaffProfile() {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(`${API_BASE_URL}/admin/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setProfile(null);
        return;
      }

      const json = (await res.json()) as { data: StaffProfile };
      setProfile(json.data);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [getAccessTokenSilently, isAuthenticated]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const role = profile?.role ?? null;
  const canWriteLeagues = role === 'manager' || role === 'league_admin';
  const canManageSiteSettings = role === 'manager' || role === 'staff';
  const isLeagueAdminOnly = role === 'league_admin';

  return {
    profile,
    role,
    loading,
    canWriteLeagues,
    canManageSiteSettings,
    isLeagueAdminOnly,
    reload: loadProfile,
  };
}
