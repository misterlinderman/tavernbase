import type { Sport } from '../../../constants/leagues';
import { POOL_FORMAT_LABELS } from '../../../constants/leagues';
import type { PublicMatch } from '../../../services/leaguesPublic';
import { bracketRoundLabel } from '../../../utils/bracketLabels';
import { formatPublicMatchResult } from '../../../utils/scoresheetPayload';
import styles from './BracketVisualization.module.css';

function participantName(match: PublicMatch): { home: string; away: string } {
  return {
    home: match.homePlayerName ?? match.homeTeamName,
    away: match.awayPlayerName ?? match.awayTeamName,
  };
}

function winnerName(match: PublicMatch, names: { home: string; away: string }): string | null {
  if (match.status !== 'final' || !match.result) {
    return null;
  }

  const winnerId = match.result.winnerPlayerId ?? match.result.winnerTeamId;

  if (winnerId) {
    if (winnerId === (match.homePlayerId ?? match.homeTeamId)) {
      return names.home;
    }

    return names.away;
  }

  if (match.result.homeScore > match.result.awayScore) {
    return names.home;
  }

  if (match.result.awayScore > match.result.homeScore) {
    return names.away;
  }

  return null;
}

export interface BracketVisualizationProps {
  matchesByRound: Array<[number, PublicMatch[]]>;
  totalRounds: number;
  sport: Sport;
}

function BracketVisualization({ matchesByRound, totalRounds, sport }: BracketVisualizationProps) {
  return (
    <div className={styles.bracket} role="list" aria-label="Tournament bracket">
      {matchesByRound.map(([roundNumber, roundMatches]) => (
        <section
          key={roundNumber}
          className={styles.roundColumn}
          role="listitem"
          aria-label={bracketRoundLabel(roundNumber, totalRounds)}
        >
          <h2 className={styles.roundTitle}>{bracketRoundLabel(roundNumber, totalRounds)}</h2>
          <ul className={styles.matchStack}>
            {roundMatches.map((match) => {
              const names = participantName(match);
              const champion = winnerName(match, names);
              const resultLine =
                match.result && match.status === 'final'
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
                      sport
                    )
                  : null;

              return (
                <li key={match._id} className={styles.matchCard}>
                  {champion ? (
                    <p className={styles.winnerLine}>{champion}</p>
                  ) : (
                    <p className={styles.matchupLine}>
                      <span>{names.home}</span>
                      <span className={styles.vs}>vs</span>
                      <span>{names.away}</span>
                    </p>
                  )}
                  {resultLine ? <p className={styles.resultLine}>{resultLine}</p> : null}
                  {!resultLine && match.status !== 'final' ? (
                    <p className={styles.statusLine}>
                      {match.poolFormat ? (
                        <span className={styles.badge}>{POOL_FORMAT_LABELS[match.poolFormat]}</span>
                      ) : null}
                      {match.raceTo ? (
                        <span className={styles.badge}>Race to {match.raceTo}</span>
                      ) : null}
                      {match.handicapLabel ? (
                        <span className={styles.badge}>{match.handicapLabel}</span>
                      ) : null}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default BracketVisualization;
