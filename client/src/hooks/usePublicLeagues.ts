import { useEffect, useState } from 'react';
import { getPublicLeagues, type PublicLeague } from '../services/leaguesPublic';

const DEFAULT_LIMIT = 3;

export function usePublicLeagues(limit = DEFAULT_LIMIT) {
  const [leagues, setLeagues] = useState<PublicLeague[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicLeagues()
      .then((data) => {
        const activeLeagues = data
          .filter((league) => league.status === 'active')
          .slice(0, limit);
        setLeagues(activeLeagues);
      })
      .catch(() => setLeagues([]))
      .finally(() => setLoading(false));
  }, [limit]);

  return { leagues, loading };
}
