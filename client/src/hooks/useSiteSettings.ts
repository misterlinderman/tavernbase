import { useCallback, useEffect, useState } from 'react';
import { getSiteSettings } from '../services/settings';
import type { SiteSettings } from '../types';

let cachedSettings: SiteSettings | null = null;

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(cachedSettings);
  const [loading, setLoading] = useState(!cachedSettings);
  const [error, setError] = useState(false);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(false);
    cachedSettings = null;

    return getSiteSettings()
      .then((data) => {
        cachedSettings = data;
        setSettings(data);
      })
      .catch(() => {
        setSettings(null);
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (cachedSettings) {
      setSettings(cachedSettings);
      setLoading(false);
      return;
    }

    refetch();
  }, [refetch]);

  return { settings, loading, error, refetch };
}
