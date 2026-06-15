import mongoose from 'mongoose';
import type { Sport } from '../../constants/leagues';
import { Division, League, Team } from '../../models';

export interface PlayerLeagueTeam {
  _id: string;
  name: string;
  divisionId: string;
  divisionName: string;
}

export interface PlayerLeagueEntrantDivision {
  divisionId: string;
  divisionName: string;
  seed: number;
}

export interface PlayerLeagueSummary {
  _id: string;
  sport: Sport;
  name: string;
  status: string;
  seasonStart: string;
  seasonEnd: string;
  format: string;
  teams: PlayerLeagueTeam[];
  entrantDivisions: PlayerLeagueEntrantDivision[];
}

export async function getPlayerLeagueSummaries(
  playerId: mongoose.Types.ObjectId | string
): Promise<PlayerLeagueSummary[]> {
  const [teams, entrantDivisions] = await Promise.all([
    Team.find({ playerIds: playerId }).sort({ name: 1 }).lean(),
    Division.find({ playerIds: playerId }).lean(),
  ]);

  const leagueIds = [
    ...new Set([
      ...teams.map((team) => String(team.leagueId)),
      ...entrantDivisions.map((division) => String(division.leagueId)),
    ]),
  ];

  if (leagueIds.length === 0) {
    return [];
  }

  const divisionIds = [
    ...new Set([
      ...teams.map((team) => String(team.divisionId)),
      ...entrantDivisions.map((division) => String(division._id)),
    ]),
  ];

  const [leagues, divisions] = await Promise.all([
    League.find({ _id: { $in: leagueIds } })
      .sort({ seasonStart: -1 })
      .lean(),
    Division.find({ _id: { $in: divisionIds } })
      .select('_id name leagueId playerIds')
      .lean(),
  ]);

  const divisionNameById = Object.fromEntries(
    divisions.map((division) => [String(division._id), division.name])
  );

  const playerIdStr = String(playerId);

  return leagues.map((league) => ({
    _id: String(league._id),
    sport: league.sport,
    name: league.name,
    status: league.status,
    seasonStart: league.seasonStart.toISOString(),
    seasonEnd: league.seasonEnd.toISOString(),
    format: league.format,
    teams: teams
      .filter((team) => String(team.leagueId) === String(league._id))
      .map((team) => ({
        _id: String(team._id),
        name: team.name,
        divisionId: String(team.divisionId),
        divisionName: divisionNameById[String(team.divisionId)] ?? 'Division',
      })),
    entrantDivisions: entrantDivisions
      .filter((division) => String(division.leagueId) === String(league._id))
      .map((division) => {
        const playerIds = (division.playerIds ?? []).map((id) => String(id));
        const seedIndex = playerIds.indexOf(playerIdStr);

        return {
          divisionId: String(division._id),
          divisionName: division.name,
          seed: seedIndex >= 0 ? seedIndex + 1 : 0,
        };
      })
      .filter((entry) => entry.seed > 0),
  }));
}
