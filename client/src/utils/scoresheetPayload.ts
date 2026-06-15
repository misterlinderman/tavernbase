import type { Sport } from '../constants/leagues';
import type {
  DartsScoresheetPayload,
  PoolScoresheetPayload,
  SportScoresheetPayload,
  VolleyballScoresheetPayload,
} from '../types/captain';

export function isPoolScoresheetPayload(
  payload: SportScoresheetPayload
): payload is PoolScoresheetPayload {
  return 'homeRaceWins' in payload && 'awayRaceWins' in payload;
}

export function isDartsScoresheetPayload(
  payload: SportScoresheetPayload
): payload is DartsScoresheetPayload {
  return 'homeLegsWon' in payload && 'awayLegsWon' in payload;
}

export function isVolleyballScoresheetPayload(
  payload: SportScoresheetPayload
): payload is VolleyballScoresheetPayload {
  return 'homeSetWins' in payload && 'awaySetWins' in payload;
}

export function formatScoresheetSummary(
  payload: SportScoresheetPayload,
  sport: Sport,
  options?: { playerPool?: boolean }
): { home: number; away: number; unit: string } {
  if (sport === 'volleyball' && isVolleyballScoresheetPayload(payload)) {
    return { home: payload.homeSetWins, away: payload.awaySetWins, unit: 'sets' };
  }

  if (sport === 'darts' && isDartsScoresheetPayload(payload)) {
    return { home: payload.homeLegsWon, away: payload.awayLegsWon, unit: 'legs' };
  }

  if (isPoolScoresheetPayload(payload)) {
    return {
      home: payload.homeRaceWins,
      away: payload.awayRaceWins,
      unit: options?.playerPool ? 'games' : 'race wins',
    };
  }

  return { home: 0, away: 0, unit: 'score' };
}

export function formatMatchResultScore(
  homeScore: number,
  awayScore: number,
  sport: Sport,
  options?: { playerPool?: boolean }
): string {
  const unit =
    sport === 'darts' ? 'legs' : sport === 'volleyball' ? 'sets' : options?.playerPool ? 'games' : '';
  const score = `${homeScore}–${awayScore}`;
  return unit ? `${score} ${unit}` : score;
}

export interface PublicMatchResultInput {
  homeTeamName: string;
  awayTeamName: string;
  homePlayerName?: string;
  awayPlayerName?: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homePlayerId?: string;
  awayPlayerId?: string;
  result: {
    homeScore: number;
    awayScore: number;
    winnerTeamId?: string;
    winnerPlayerId?: string;
  };
}

export function formatPublicMatchResult(match: PublicMatchResultInput, sport: Sport): string {
  const homeName = match.homePlayerName ?? match.homeTeamName;
  const awayName = match.awayPlayerName ?? match.awayTeamName;
  const { homeScore, awayScore, winnerPlayerId, winnerTeamId } = match.result;
  const winnerId = winnerPlayerId ?? winnerTeamId;

  let winnerName: string;
  let loserName: string;

  if (winnerId) {
    const homeId = match.homePlayerId ?? match.homeTeamId;
    if (winnerId === homeId) {
      winnerName = homeName;
      loserName = awayName;
    } else {
      winnerName = awayName;
      loserName = homeName;
    }
  } else if (homeScore > awayScore) {
    winnerName = homeName;
    loserName = awayName;
  } else if (awayScore > homeScore) {
    winnerName = awayName;
    loserName = homeName;
  } else {
    return formatMatchResultScore(homeScore, awayScore, sport);
  }

  return `${winnerName} def. ${loserName} ${formatMatchResultScore(homeScore, awayScore, sport, {
    playerPool: sport === 'pool' && Boolean(match.homePlayerId ?? match.awayPlayerId),
  })}`;
}

export function buildSportScoresheetPayload(
  sport: Sport,
  home: number,
  away: number
): SportScoresheetPayload {
  if (sport === 'volleyball') {
    return { homeSetWins: home, awaySetWins: away };
  }

  if (sport === 'darts') {
    return { homeLegsWon: home, awayLegsWon: away };
  }

  return { homeRaceWins: home, awayRaceWins: away };
}

export function disputeFieldLabels(
  sport: Sport,
  options?: { playerPool?: boolean }
): { home: string; away: string } {
  if (sport === 'volleyball') {
    return { home: 'Home sets won', away: 'Away sets won' };
  }

  if (sport === 'darts') {
    return { home: 'Home legs won', away: 'Away legs won' };
  }

  if (options?.playerPool) {
    return { home: 'Home games won', away: 'Away games won' };
  }

  return { home: 'Home race wins', away: 'Away race wins' };
}
