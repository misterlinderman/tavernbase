import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FORMAT_LABELS, SPORT_LABELS, STATUS_LABELS } from '../../constants/leagues';
import type { LeagueFormat, LeagueStatus } from '../../constants/leagues';
import { usePlayerApi } from '../../hooks/usePlayerApi';
import { getPlayerLeagueStandings } from '../../services/player';
import type { PlayerProfile } from '../../types/player';
import type { StandingsView } from '../../types/leagues';
import { formatPlacement, isPlacementStandings } from '../../utils/placement';
import formStyles from '../../components/admin/shared/adminForm.module.css';
import styles from './PlayerPage.module.css';

function formatSeasonRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return '—';
  }

  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${startDate.toLocaleDateString('en-US', opts)} – ${endDate.toLocaleDateString('en-US', opts)}`;
}

function StandingsBlock({ standings }: { standings: StandingsView[] }) {
  if (standings.every((view) => view.entries.length === 0)) {
    return <p className={styles.empty}>Standings will appear once matches are played.</p>;
  }

  return standings.map((view) =>
    view.entries.length === 0 ? null : (
      <section key={view.divisionId} className={styles.standingsBlock}>
        <h3 className={styles.divisionTitle}>{view.divisionName}</h3>
        <table className={styles.standingsTable}>
          <thead>
            <tr>
              {isPlacementStandings(view.standingsType) ? (
                <>
                  <th scope="col">Place</th>
                  <th scope="col">Player</th>
                </>
              ) : (
                <>
                  <th scope="col">#</th>
                  <th scope="col">Team</th>
                  <th scope="col">W</th>
                  <th scope="col">L</th>
                  <th scope="col">T</th>
                  <th scope="col">Pts</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {view.entries.map((entry) => (
              <tr key={entry.playerId ?? entry.teamId ?? entry.teamName}>
                {isPlacementStandings(view.standingsType) ? (
                  <>
                    <td>{formatPlacement(entry.placement ?? entry.rank)}</td>
                    <td>{entry.playerName ?? entry.teamName}</td>
                  </>
                ) : (
                  <>
                    <td>{entry.rank}</td>
                    <td>{entry.teamName}</td>
                    <td>{entry.wins}</td>
                    <td>{entry.losses}</td>
                    <td>{entry.ties}</td>
                    <td>{entry.points}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    )
  );
}

function PlayerPage() {
  const profile = useOutletContext<PlayerProfile | null>();
  const { playerFetchList } = usePlayerApi();
  const [standingsByLeague, setStandingsByLeague] = useState<Record<string, StandingsView[]>>({});
  const [loadingStandings, setLoadingStandings] = useState(true);

  useEffect(() => {
    if (!profile || profile.leagues.length === 0) {
      setLoadingStandings(false);
      return;
    }

    Promise.all(
      profile.leagues.map(async (league) => {
        const standings = await getPlayerLeagueStandings(playerFetchList, league._id);
        return [league._id, standings] as const;
      })
    )
      .then((entries) => setStandingsByLeague(Object.fromEntries(entries)))
      .catch(() => setStandingsByLeague({}))
      .finally(() => setLoadingStandings(false));
  }, [profile, playerFetchList]);

  if (!profile) {
    return <p className={styles.empty}>Loading your leagues…</p>;
  }

  return (
    <div>
      <h1 className={formStyles.pageTitle}>My leagues</h1>
      <p className={styles.intro}>
        Standings for your leagues. Team captains enter scores at{' '}
        <a href="/captain/login">/captain/login</a>. If you are entered in an individual
        tournament, use Submit scores in the sidebar.
      </p>

      {profile.leagues.length === 0 ? (
        <section className={`${formStyles.panel} ${styles.section}`}>
          <p className={styles.empty}>
            You are not entered in any leagues yet. Contact your league manager to be added.
          </p>
        </section>
      ) : (
        <div className={styles.leagueStack}>
          {profile.leagues.map((league) => (
            <section key={league._id} className={`${formStyles.panel} ${styles.leagueCard}`}>
              <header className={styles.leagueHeader}>
                <div>
                  <span className={styles.sportBadge}>{SPORT_LABELS[league.sport]}</span>
                  <h2 className={styles.leagueName}>{league.name}</h2>
                  <p className={styles.leagueMeta}>
                    {formatSeasonRange(league.seasonStart, league.seasonEnd)} ·{' '}
                    {FORMAT_LABELS[league.format as LeagueFormat]} ·{' '}
                    {STATUS_LABELS[league.status as LeagueStatus]}
                  </p>
                </div>
              </header>

              {league.teams.length > 0 ? (
                <p className={styles.teamList}>
                  Your team{league.teams.length === 1 ? '' : 's'}:{' '}
                  {league.teams
                    .map((team) => `${team.name} (${team.divisionName})`)
                    .join(' · ')}
                </p>
              ) : null}

              {(league.entrantDivisions ?? []).length > 0 ? (
                <p className={styles.teamList}>
                  Entered as player:{' '}
                  {league.entrantDivisions
                    ?.map(
                      (entry) =>
                        `${entry.divisionName}${entry.seed > 0 ? ` (seed #${entry.seed})` : ''}`
                    )
                    .join(' · ')}
                </p>
              ) : null}

              <h3 className={styles.standingsHeading}>Standings</h3>
              {loadingStandings ? (
                <p className={styles.empty}>Loading standings…</p>
              ) : (
                <StandingsBlock standings={standingsByLeague[league._id] ?? []} />
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default PlayerPage;
