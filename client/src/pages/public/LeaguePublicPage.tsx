import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BracketEmptyPanel from '../../components/public/BracketEmptyPanel';
import BracketVisualization from '../../components/public/BracketVisualization';
import Footer from '../../components/public/Footer';
import Nav from '../../components/public/Nav';
import {
  FORMAT_LABELS,
  KIND_LABELS,
  MATCH_STATUS_LABELS,
  POOL_FORMAT_LABELS,
  SPORT_LABELS,
  STATUS_LABELS,
} from '../../constants/leagues';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import {
  getPublicLeague,
  getPublicMatches,
  getPublicStandings,
  type PublicMatch,
} from '../../services/leaguesPublic';
import type { StandingsView } from '../../types/leagues';
import { bracketRoundLabel } from '../../utils/bracketLabels';
import { formatPlacement, isPlacementStandings } from '../../utils/placement';
import { formatPublicMatchResult } from '../../utils/scoresheetPayload';
import homeStyles from './HomePage.module.css';
import styles from './LeaguePublicPage.module.css';

type Tab = 'standings' | 'schedule' | 'placements';

function resolveLeagueKind(kind?: string): 'league' | 'tournament' {
  return kind === 'tournament' ? 'tournament' : 'league';
}

function formatMatchDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function participantName(match: PublicMatch): { home: string; away: string } {
  return {
    home: match.homePlayerName ?? match.homeTeamName,
    away: match.awayPlayerName ?? match.awayTeamName,
  };
}

function LeaguePublicPage() {
  const { leagueId = '' } = useParams();
  const { settings, loading: settingsLoading } = useSiteSettings();
  const [tab, setTab] = useState<Tab>('schedule');
  const [league, setLeague] = useState<Awaited<ReturnType<typeof getPublicLeague>> | null>(null);
  const [standings, setStandings] = useState<StandingsView[]>([]);
  const [matches, setMatches] = useState<PublicMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const leagueKind = resolveLeagueKind(league?.kind);
  const isTournament = leagueKind === 'tournament';
  const isBracket = league?.format === 'bracket';

  useEffect(() => {
    if (!leagueId) return;

    Promise.all([
      getPublicLeague(leagueId),
      getPublicStandings(leagueId),
      getPublicMatches(leagueId),
    ])
      .then(([leagueDetail, standingsList, matchList]) => {
        setLeague(leagueDetail);
        setStandings(standingsList);
        setMatches(matchList);
        setTab(resolveLeagueKind(leagueDetail.kind) === 'tournament' ? 'schedule' : 'standings');
      })
      .catch(() => setLeague(null))
      .finally(() => setLoading(false));
  }, [leagueId]);

  const matchesByRound = useMemo(() => {
    const grouped = new Map<number, PublicMatch[]>();

    for (const match of matches) {
      const roundMatches = grouped.get(match.roundNumber) ?? [];
      roundMatches.push(match);
      grouped.set(match.roundNumber, roundMatches);
    }

    return [...grouped.entries()].sort(([a], [b]) => a - b);
  }, [matches]);

  const totalBracketRounds = useMemo(
    () => matches.reduce((max, match) => Math.max(max, match.roundNumber), 0),
    [matches]
  );

  const hasPlacements = standings.some((view) => view.entries.length > 0);

  if (settingsLoading || loading) {
    return (
      <div className={homeStyles.loading}>
        <div className={homeStyles.spinner} aria-hidden="true" />
        <p className={homeStyles.loadingText}>Loading…</p>
      </div>
    );
  }

  if (!league) {
    return (
      <>
        <Nav />
        <main id="main" className={`section ${styles.main}`}>
          <div className="wrap">
            <p className={styles.empty}>League not found.</p>
            <Link to="/leagues" className={styles.backLink}>
              ← All leagues
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main id="main" className={`section ${styles.main}`}>
        <div className="wrap">
          <header className={styles.header}>
            <Link to="/leagues" className={styles.backLink}>
              ← All leagues
            </Link>
            <p className={styles.subtitle}>
              {SPORT_LABELS[league.sport]}
              {isTournament ? ` · ${KIND_LABELS.tournament}` : ''}
            </p>
            <h1 className={styles.title}>{league.name}</h1>
            <p className={styles.subtitle}>
              {isBracket ? 'Singles knockout' : FORMAT_LABELS[league.format]} ·{' '}
              {STATUS_LABELS[league.status]}
            </p>
          </header>

          <div className={styles.tabs} role="tablist" aria-label="League views">
            {!isTournament ? (
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'standings'}
                className={tab === 'standings' ? styles.tabActive : styles.tab}
                onClick={() => setTab('standings')}
              >
                Standings
              </button>
            ) : (
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'placements'}
                className={tab === 'placements' ? styles.tabActive : styles.tab}
                onClick={() => setTab('placements')}
              >
                Placements
              </button>
            )}
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'schedule'}
              className={tab === 'schedule' ? styles.tabActive : styles.tab}
              onClick={() => setTab('schedule')}
            >
              {isBracket ? 'Bracket' : 'Schedule'}
            </button>
          </div>

          {tab === 'placements' ? (
            !hasPlacements ? (
              <p className={styles.empty}>
                Placements will appear as players are eliminated from the bracket.
              </p>
            ) : (
              standings.map((view) =>
                view.entries.length === 0 ? null : (
                  <section key={view.divisionId} className={styles.block}>
                    <h2 className={styles.blockTitle}>{view.divisionName}</h2>
                    <table className={styles.standingsTable}>
                      <thead>
                        <tr>
                          <th>Place</th>
                          <th>{isPlacementStandings(view.standingsType) ? 'Player' : 'Team'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {view.entries.map((entry) => (
                          <tr key={entry.playerId ?? entry.teamId ?? entry.teamName}>
                            <td>{formatPlacement(entry.placement ?? entry.rank)}</td>
                            <td>{entry.playerName ?? entry.teamName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                )
              )
            )
          ) : tab === 'standings' ? (
            standings.every((view) => view.entries.length === 0) ? (
              <p className={styles.empty}>Standings will appear once matches are played.</p>
            ) : (
              standings.map((view) =>
                view.entries.length === 0 ? null : (
                  <section key={view.divisionId} className={styles.block}>
                    <h2 className={styles.blockTitle}>{view.divisionName}</h2>
                    <table className={styles.standingsTable}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Team</th>
                          <th>W</th>
                          <th>L</th>
                          <th>T</th>
                          <th>Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {view.entries.map((entry) => (
                          <tr key={entry.teamId ?? entry.playerId ?? entry.teamName}>
                            <td>{entry.rank}</td>
                            <td>{entry.teamName}</td>
                            <td>{entry.wins}</td>
                            <td>{entry.losses}</td>
                            <td>{entry.ties}</td>
                            <td>{entry.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                )
              )
            )
          ) : matches.length === 0 ? (
            isBracket ? (
              <BracketEmptyPanel />
            ) : (
              <p className={styles.empty}>Schedule coming soon.</p>
            )
          ) : isBracket ? (
            <BracketVisualization
              matchesByRound={matchesByRound}
              totalRounds={totalBracketRounds}
              sport={league.sport}
            />
          ) : (
            matchesByRound.map(([roundNumber, roundMatches]) => (
              <section key={roundNumber} className={styles.block}>
                <h2 className={styles.blockTitle}>
                  {isBracket
                    ? bracketRoundLabel(roundNumber, totalBracketRounds)
                    : `Round ${roundNumber}`}
                </h2>
                <ul className={styles.matchList}>
                  {roundMatches.map((match) => {
                    const names = participantName(match);
                    const resultLine =
                      match.result && league
                        ? formatPublicMatchResult(
                            {
                              homeTeamName: names.home,
                              awayTeamName: names.away,
                              homePlayerName: match.homePlayerName,
                              awayPlayerName: match.awayPlayerName,
                              homePlayerId: match.homePlayerId,
                              awayPlayerId: match.awayPlayerId,
                              homeTeamId: match.homeTeamId,
                              awayTeamId: match.awayTeamId,
                              result: match.result,
                            },
                            league.sport
                          )
                        : null;

                    return (
                      <li key={match._id} className={styles.matchRow}>
                        <p className={styles.matchTeams}>
                          {names.home} vs {names.away}
                          {match.poolFormat ? (
                            <span className={styles.formatBadge}>
                              {POOL_FORMAT_LABELS[match.poolFormat]}
                            </span>
                          ) : null}
                          {match.handicapLabel ? (
                            <span className={styles.formatBadge}>{match.handicapLabel}</span>
                          ) : null}
                          {match.raceTo ? (
                            <span className={styles.formatBadge}>Race to {match.raceTo}</span>
                          ) : null}
                        </p>
                        <p className={styles.matchMeta}>
                          {formatMatchDate(match.scheduledAt)} · {match.divisionName}
                          {match.status !== 'final' ? (
                            <>
                              {' '}
                              ·{' '}
                              {MATCH_STATUS_LABELS[
                                match.status as keyof typeof MATCH_STATUS_LABELS
                              ] ?? match.status}
                            </>
                          ) : null}
                          {resultLine ? (
                            <span className={styles.score}> · {resultLine}</span>
                          ) : null}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}

          {isTournament && !hasPlacements ? (
            <p className={styles.tournamentNote}>
              Final placements will be posted as matches are completed.
            </p>
          ) : null}
        </div>
      </main>
      {settings ? <Footer settings={settings} /> : null}
    </>
  );
}

export default LeaguePublicPage;
