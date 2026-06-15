import mongoose from 'mongoose';
import { Match, Team } from '../../../models';
import type { ComputedStandingsEntry } from './StandingsEngine';

const WIN_POINTS = 2;
const TIE_POINTS = 1;

interface TeamStats {
  teamId: mongoose.Types.ObjectId;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  gamesPlayed: number;
}

function applyResult(stats: TeamStats, outcome: 'win' | 'loss' | 'tie'): void {
  stats.gamesPlayed += 1;

  if (outcome === 'win') {
    stats.wins += 1;
    stats.points += WIN_POINTS;
    return;
  }

  if (outcome === 'tie') {
    stats.ties += 1;
    stats.points += TIE_POINTS;
    return;
  }

  stats.losses += 1;
}

function compareStandings(a: TeamStats, b: TeamStats): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.wins !== a.wins) return b.wins - a.wins;
  if (a.losses !== b.losses) return a.losses - b.losses;
  return a.teamName.localeCompare(b.teamName);
}

export async function computeVolleyballDivisionStandings(
  leagueId: mongoose.Types.ObjectId,
  divisionId: mongoose.Types.ObjectId
): Promise<ComputedStandingsEntry[]> {
  const teams = await Team.find({ leagueId, divisionId }).sort({ name: 1 }).lean();

  const statsByTeamId = new Map<string, TeamStats>();

  for (const team of teams) {
    statsByTeamId.set(String(team._id), {
      teamId: team._id,
      teamName: team.name,
      wins: 0,
      losses: 0,
      ties: 0,
      points: 0,
      gamesPlayed: 0,
    });
  }

  const finalMatches = await Match.find({ leagueId, divisionId, status: 'final' }).lean();

  for (const match of finalMatches) {
    if (!match.result) continue;

    const homeStats = statsByTeamId.get(String(match.homeTeamId));
    const awayStats = statsByTeamId.get(String(match.awayTeamId));

    if (!homeStats || !awayStats) continue;

    const { homeScore, awayScore } = match.result;

    if (homeScore > awayScore) {
      applyResult(homeStats, 'win');
      applyResult(awayStats, 'loss');
    } else if (awayScore > homeScore) {
      applyResult(awayStats, 'win');
      applyResult(homeStats, 'loss');
    } else {
      applyResult(homeStats, 'tie');
      applyResult(awayStats, 'tie');
    }
  }

  const ranked = [...statsByTeamId.values()].sort(compareStandings);

  return ranked.map((entry, index) => ({
    teamId: entry.teamId,
    teamName: entry.teamName,
    rank: index + 1,
    wins: entry.wins,
    losses: entry.losses,
    ties: entry.ties,
    points: entry.points,
    gamesPlayed: entry.gamesPlayed,
  }));
}

export const volleyballStandingsEngine = {
  sport: 'volleyball' as const,
  computeDivisionStandings: computeVolleyballDivisionStandings,
};
