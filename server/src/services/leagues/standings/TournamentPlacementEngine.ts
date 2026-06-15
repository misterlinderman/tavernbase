import mongoose from 'mongoose';
import { Division, Match, Player, Team } from '../../../models';
import type { IMatchResult } from '../../../models/leagues/Match';
import { isPlayerMatch } from '../matchLabels';
import type { ComputedStandingsEntry } from './StandingsEngine';

interface FinalMatch {
  roundNumber: number;
  scheduledAt: Date;
  homePlayerId?: mongoose.Types.ObjectId;
  awayPlayerId?: mongoose.Types.ObjectId;
  homeTeamId?: mongoose.Types.ObjectId;
  awayTeamId?: mongoose.Types.ObjectId;
  result?: IMatchResult;
}

function getWinnerId(match: FinalMatch): mongoose.Types.ObjectId | null {
  const result = match.result;

  if (!result) {
    return null;
  }

  if (isPlayerMatch(match)) {
    if (result.winnerPlayerId) {
      return result.winnerPlayerId;
    }

    if (result.homeScore > result.awayScore) {
      return match.homePlayerId ?? null;
    }

    if (result.awayScore > result.homeScore) {
      return match.awayPlayerId ?? null;
    }

    return null;
  }

  if (result.winnerTeamId) {
    return result.winnerTeamId;
  }

  if (result.homeScore > result.awayScore) {
    return match.homeTeamId ?? null;
  }

  if (result.awayScore > result.homeScore) {
    return match.awayTeamId ?? null;
  }

  return null;
}

function getLoserId(
  match: FinalMatch,
  winnerId: mongoose.Types.ObjectId
): mongoose.Types.ObjectId | null {
  if (isPlayerMatch(match)) {
    if (match.homePlayerId?.equals(winnerId)) {
      return match.awayPlayerId ?? null;
    }

    return match.homePlayerId ?? null;
  }

  if (match.homeTeamId?.equals(winnerId)) {
    return match.awayTeamId ?? null;
  }

  return match.homeTeamId ?? null;
}

export function computeBracketPlacements(
  matches: FinalMatch[]
): Map<string, number> {
  const placements = new Map<string, number>();

  if (matches.length === 0) {
    return placements;
  }

  const maxRound = matches.reduce((max, match) => Math.max(max, match.roundNumber), 0);
  const finalRoundMatches = matches
    .filter((match) => match.roundNumber === maxRound)
    .sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime());

  if (finalRoundMatches.length === 1) {
    const finalMatch = finalRoundMatches[0];
    const winnerId = getWinnerId(finalMatch);

    if (winnerId) {
      placements.set(String(winnerId), 1);
      const loserId = getLoserId(finalMatch, winnerId);

      if (loserId) {
        placements.set(String(loserId), 2);
      }
    }
  }

  let nextPlacement = 3;

  for (let round = maxRound - 1; round >= 1; round -= 1) {
    const roundMatches = matches
      .filter((match) => match.roundNumber === round)
      .sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime());

    for (const match of roundMatches) {
      const winnerId = getWinnerId(match);

      if (!winnerId) {
        continue;
      }

      const loserId = getLoserId(match, winnerId);

      if (!loserId || placements.has(String(loserId))) {
        continue;
      }

      placements.set(String(loserId), nextPlacement);
      nextPlacement += 1;
    }
  }

  return placements;
}

export async function computeTournamentPlacement(
  leagueId: mongoose.Types.ObjectId,
  divisionId: mongoose.Types.ObjectId,
  entrantType: 'team' | 'player' = 'player'
): Promise<ComputedStandingsEntry[]> {
  const division = await Division.findOne({ _id: divisionId, leagueId }).lean();

  if (!division) {
    return [];
  }

  const finalMatches = await Match.find({ leagueId, divisionId, status: 'final' })
    .sort({ roundNumber: 1, scheduledAt: 1 })
    .lean();

  const placements = computeBracketPlacements(finalMatches);

  if (entrantType === 'player') {
    const playerIds = division.playerIds ?? [];
    const players = await Player.find({ _id: { $in: playerIds } })
      .select('_id name')
      .lean();
    const playerNameById = Object.fromEntries(
      players.map((player) => [String(player._id), player.name])
    );

    const entries: ComputedStandingsEntry[] = [];

    for (const playerId of playerIds) {
      const placement = placements.get(String(playerId));

      if (!placement) {
        continue;
      }

      entries.push({
        playerId,
        teamName: playerNameById[String(playerId)] ?? 'Unknown player',
        rank: placement,
        placement,
        wins: 0,
        losses: 0,
        ties: 0,
        points: 0,
        gamesPlayed: 0,
      });
    }

    return entries.sort((left, right) => left.rank - right.rank);
  }

  const teams = await Team.find({ leagueId, divisionId }).sort({ name: 1 }).lean();
  const teamEntries: ComputedStandingsEntry[] = [];

  for (const team of teams) {
    const placement = placements.get(String(team._id));

    if (!placement) {
      continue;
    }

    teamEntries.push({
      teamId: team._id,
      teamName: team.name,
      rank: placement,
      placement,
      wins: 0,
      losses: 0,
      ties: 0,
      points: 0,
      gamesPlayed: 0,
    });
  }

  return teamEntries.sort((left, right) => left.rank - right.rank);
}
