import { SPORTS, type Sport } from '../../constants/leagues';
import { Division, League, Match, Scoresheet, Team } from '../../models';
import {
  collectMatchParticipantIds,
  formatMatchSides,
  loadParticipantNameMaps,
} from './matchLabels';

export interface LeaguesOverviewDispute {
  matchId: string;
  leagueId: string;
  leagueName: string;
  sport: Sport;
  homeTeamName: string;
  awayTeamName: string;
}

export interface LeaguesOverviewLeague {
  _id: string;
  sport: Sport;
  name: string;
  seasonStart: string;
  seasonEnd: string;
  format: string;
  status: string;
  divisionCount: number;
  disputedCount: number;
}

export interface LeaguesOverview {
  activeBySport: Record<Sport, number>;
  disputedMatchCount: number;
  upcomingMatchCount: number;
  disputedMatches: LeaguesOverviewDispute[];
  leagues: LeaguesOverviewLeague[];
}

function startOfWeekWindow(): { now: Date; weekEnd: Date } {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return { now, weekEnd };
}

export async function getLeaguesOverview(): Promise<LeaguesOverview> {
  const { now, weekEnd } = startOfWeekWindow();

  const leagues = await League.find().sort({ seasonStart: -1 }).lean();
  const leagueIds = leagues.map((league) => league._id);
  const leagueById = Object.fromEntries(leagues.map((league) => [String(league._id), league]));

  const [divisionCounts, disputedSheets, upcomingMatchCount] = await Promise.all([
    Division.aggregate<{ _id: typeof leagueIds[number]; count: number }>([
      { $match: { leagueId: { $in: leagueIds } } },
      { $group: { _id: '$leagueId', count: { $sum: 1 } } },
    ]),
    Scoresheet.find({ status: 'disputed' }).select('matchId').lean(),
    Match.countDocuments({
      status: { $in: ['scheduled', 'in_progress'] },
      scheduledAt: { $gte: now, $lte: weekEnd },
    }),
  ]);

  const divisionCountByLeague = Object.fromEntries(
    divisionCounts.map((row) => [String(row._id), row.count])
  );

  const disputedMatchIds = [
    ...new Set(disputedSheets.map((sheet) => String(sheet.matchId))),
  ];

  const disputedMatchesRaw =
    disputedMatchIds.length > 0
      ? await Match.find({ _id: { $in: disputedMatchIds } }).lean()
      : [];

  const disputedCountByLeague: Record<string, number> = {};
  for (const match of disputedMatchesRaw) {
    const leagueId = String(match.leagueId);
    disputedCountByLeague[leagueId] = (disputedCountByLeague[leagueId] ?? 0) + 1;
  }

  const { teamIds, playerIds } = collectMatchParticipantIds(disputedMatchesRaw);
  const { teamNameById, playerNameById } = await loadParticipantNameMaps(teamIds, playerIds);

  const disputedMatches: LeaguesOverviewDispute[] = disputedMatchesRaw
    .map((match) => {
      const league = leagueById[String(match.leagueId)];

      if (!league) {
        return null;
      }

      const sides = formatMatchSides(match, teamNameById, playerNameById);

      return {
        matchId: String(match._id),
        leagueId: String(match.leagueId),
        leagueName: league.name,
        sport: league.sport,
        homeTeamName: sides.homeTeamName ?? 'Home',
        awayTeamName: sides.awayTeamName ?? 'Away',
      };
    })
    .filter((item): item is LeaguesOverviewDispute => item !== null)
    .sort((a, b) => a.leagueName.localeCompare(b.leagueName));

  const activeBySport = Object.fromEntries(SPORTS.map((sport) => [sport, 0])) as Record<
    Sport,
    number
  >;

  for (const league of leagues) {
    if (league.status === 'active') {
      activeBySport[league.sport] += 1;
    }
  }

  const overviewLeagues: LeaguesOverviewLeague[] = leagues.map((league) => ({
    _id: String(league._id),
    sport: league.sport,
    name: league.name,
    seasonStart: league.seasonStart.toISOString(),
    seasonEnd: league.seasonEnd.toISOString(),
    format: league.format,
    status: league.status,
    divisionCount: divisionCountByLeague[String(league._id)] ?? 0,
    disputedCount: disputedCountByLeague[String(league._id)] ?? 0,
  }));

  return {
    activeBySport,
    disputedMatchCount: disputedMatches.length,
    upcomingMatchCount,
    disputedMatches,
    leagues: overviewLeagues,
  };
}
