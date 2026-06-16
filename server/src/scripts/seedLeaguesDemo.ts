import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import {
  DEFAULT_POOL_PLAYER_RACE_TO,
  type EntrantType,
  type LeagueFormat,
  type LeagueKind,
  type PoolFormat,
  type Sport,
} from '../constants/leagues';
import { loadEstablishmentConfig } from '../config/establishment';
import { connectDatabase } from '../config/db';
import {
  DartsMatch,
  Division,
  League,
  Match,
  Player,
  PoolMatch,
  Scoresheet,
  SiteSettings,
  StandingsSnapshot,
  Team,
  VolleyballMatch,
} from '../models';
import { finalizeMatchFromPayload } from '../services/leagues/scoresheet';
import { generateBracketPairings } from '../services/leagues/schedule/bracket';
import { generateLadderPairings } from '../services/leagues/schedule/ladder';
import {
  generateRoundRobinPairings,
  parseMatchTime,
  scheduledAtForRound,
} from '../services/leagues/schedule/roundRobin';
import { recomputeStandingsForLeague } from '../services/leagues/standings';

const DEMO_PREFIX = '[Demo]';
const DEMO_EMAIL_DOMAIN = '@demo.seed';
const TEAM_COUNT = 4;
const PLAYERS_PER_TEAM = 3;
const TOURNAMENT_PLAYER_COUNT = 8;

const TEAM_NAMES_BY_SPORT: Record<Sport, string[]> = {
  pool: ['Emerald Sharks', 'Cue Crew', 'Rack Attack', 'Chalk Dodgers'],
  darts: ['Bullseye Brigade', 'Flight Club', 'Triple Twenty', 'Oche Owls'],
  volleyball: ['Set Point', 'Net Gains', 'Spike Squad', 'Sandbaggers'],
};

const DEMO_PLAYER_NAMES = [
  'Alex O\'Sullivan',
  'Bri Murphy',
  'Chris Delaney',
  'Dana Keegan',
  'Evan Walsh',
  'Fiona Ross',
  'Gus Brennan',
  'Hannah Cole',
  'Ian Mercer',
  'Jules Park',
  'Kai Nguyen',
  'Lena Ortiz',
  'Mick Sullivan',
  'Nora Flynn',
  'Owen Briggs',
  'Piper Shaw',
  'Quinn Hayes',
  'Riley Stone',
  'Sam O\'Donnell',
  'Tess Monroe',
  'Uma Patel',
  'Vince Carter',
  'Willa Grant',
  'Xander Bell',
  'Yara Kim',
  'Zoe Hart',
  'Aiden Cross',
  'Brooke Lane',
  'Caleb Finn',
  'Drew Mason',
  'Ellis Reed',
  'Frankie Vale',
  'Greta Moss',
  'Harper Quinn',
  'Ivy Brooks',
  'Jasper Cole',
  'Knox Avery',
  'Lila Crane',
  'Mason Pike',
  'Nina Holt',
  'Oscar Dean',
  'Paige Frost',
  'Reed Nash',
  'Sloane West',
];

interface LeagueSeedConfig {
  name: string;
  sport: Sport;
  format: LeagueFormat;
  kind: LeagueKind;
  entrantType: EntrantType;
  poolFormat?: PoolFormat;
  raceTo?: number;
  divisionName: string;
}

const DEMO_LEAGUES: LeagueSeedConfig[] = [
  {
    name: `${DEMO_PREFIX} Pool — Round Robin`,
    sport: 'pool',
    format: 'round_robin',
    kind: 'league',
    entrantType: 'team',
    poolFormat: '8_ball',
    divisionName: 'Open 8-Ball',
  },
  {
    name: `${DEMO_PREFIX} Pool — Ladder`,
    sport: 'pool',
    format: 'ladder',
    kind: 'league',
    entrantType: 'team',
    poolFormat: '8_ball',
    divisionName: 'Open 8-Ball',
  },
  {
    name: `${DEMO_PREFIX} Pool — 9-Ball Singles KO`,
    sport: 'pool',
    format: 'bracket',
    kind: 'tournament',
    entrantType: 'player',
    poolFormat: '9_ball',
    raceTo: DEFAULT_POOL_PLAYER_RACE_TO,
    divisionName: 'Singles Bracket',
  },
  {
    name: `${DEMO_PREFIX} Darts — Round Robin`,
    sport: 'darts',
    format: 'round_robin',
    kind: 'league',
    entrantType: 'team',
    divisionName: 'Team Legs',
  },
  {
    name: `${DEMO_PREFIX} Darts — Ladder`,
    sport: 'darts',
    format: 'ladder',
    kind: 'league',
    entrantType: 'team',
    divisionName: 'Team Legs',
  },
  {
    name: `${DEMO_PREFIX} Darts — 501 Singles KO`,
    sport: 'darts',
    format: 'bracket',
    kind: 'tournament',
    entrantType: 'player',
    divisionName: 'Singles Bracket',
  },
  {
    name: `${DEMO_PREFIX} Volleyball — Round Robin`,
    sport: 'volleyball',
    format: 'round_robin',
    kind: 'league',
    entrantType: 'team',
    divisionName: 'Rec League',
  },
  {
    name: `${DEMO_PREFIX} Volleyball — Ladder`,
    sport: 'volleyball',
    format: 'ladder',
    kind: 'league',
    entrantType: 'team',
    divisionName: 'Rec League',
  },
  {
    name: `${DEMO_PREFIX} Volleyball — Singles KO`,
    sport: 'volleyball',
    format: 'bracket',
    kind: 'tournament',
    entrantType: 'player',
    divisionName: 'Singles Bracket',
  },
];

function seasonDates(kind: LeagueKind): { seasonStart: Date; seasonEnd: Date } {
  const seasonStart = new Date();
  seasonStart.setHours(0, 0, 0, 0);
  seasonStart.setDate(seasonStart.getDate() + 7);

  const seasonEnd = new Date(seasonStart);

  if (kind === 'tournament') {
    seasonEnd.setDate(seasonEnd.getDate() + 21);
  } else {
    seasonEnd.setMonth(seasonEnd.getMonth() + 4);
  }

  return { seasonStart, seasonEnd };
}

function scheduleStartDate(): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + 3);
  return start;
}

async function clearDemoData(): Promise<void> {
  const leagues = await League.find({ name: { $regex: `^${DEMO_PREFIX.replace('[', '\\[')}` } }).select(
    '_id name'
  );
  const leagueIds = leagues.map((league) => league._id);

  if (leagueIds.length === 0) {
    return;
  }

  const matchIds = await Match.find({ leagueId: { $in: leagueIds } }).distinct('_id');

  await Promise.all([
    Scoresheet.deleteMany({ matchId: { $in: matchIds } }),
    StandingsSnapshot.deleteMany({ leagueId: { $in: leagueIds } }),
    Match.deleteMany({ leagueId: { $in: leagueIds } }),
    Team.deleteMany({ leagueId: { $in: leagueIds } }),
    Division.deleteMany({ leagueId: { $in: leagueIds } }),
    League.deleteMany({ _id: { $in: leagueIds } }),
  ]);

  await Player.deleteMany({ email: { $regex: `${DEMO_EMAIL_DOMAIN.replace('.', '\\.')}$` } });

  console.log(`Cleared ${leagues.length} demo league(s) and related data.`);
}

async function ensureSportsEnabled(): Promise<void> {
  await SiteSettings.findOneAndUpdate(
    {},
    {
      $set: {
        'sportsEnabled.pool': true,
        'sportsEnabled.darts': true,
        'sportsEnabled.volleyball': true,
      },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
}

async function createDemoPlayers(establishmentSlug: string): Promise<mongoose.Types.ObjectId[]> {
  const players = await Player.insertMany(
    DEMO_PLAYER_NAMES.map((name, index) => ({
      name,
      email: `demo-player-${String(index + 1).padStart(2, '0')}${DEMO_EMAIL_DOMAIN}`,
      establishmentSlug,
    }))
  );

  return players.map((player) => player._id);
}

function sportTeamPlayerSlice(sport: Sport): { start: number; count: number } {
  switch (sport) {
    case 'pool':
      return { start: 0, count: TEAM_COUNT * PLAYERS_PER_TEAM };
    case 'darts':
      return { start: 12, count: TEAM_COUNT * PLAYERS_PER_TEAM };
    case 'volleyball':
      return { start: 24, count: TEAM_COUNT * PLAYERS_PER_TEAM };
    default:
      return { start: 0, count: TEAM_COUNT * PLAYERS_PER_TEAM };
  }
}

function tournamentPlayerIds(allPlayerIds: mongoose.Types.ObjectId[]): mongoose.Types.ObjectId[] {
  return allPlayerIds.slice(-TOURNAMENT_PLAYER_COUNT);
}

async function createTeamsForLeague(
  leagueId: mongoose.Types.ObjectId,
  divisionId: mongoose.Types.ObjectId,
  sport: Sport,
  playerIds: mongoose.Types.ObjectId[]
): Promise<mongoose.Types.ObjectId[]> {
  const slice = sportTeamPlayerSlice(sport);
  const sportPlayers = playerIds.slice(slice.start, slice.start + slice.count);
  const teamNames = TEAM_NAMES_BY_SPORT[sport];
  const teamIds: mongoose.Types.ObjectId[] = [];

  for (let teamIndex = 0; teamIndex < TEAM_COUNT; teamIndex += 1) {
    const rosterStart = teamIndex * PLAYERS_PER_TEAM;
    const roster = sportPlayers.slice(rosterStart, rosterStart + PLAYERS_PER_TEAM);

    const team = await Team.create({
      leagueId,
      divisionId,
      name: teamNames[teamIndex],
      captainPlayerId: roster[0],
      playerIds: roster,
    });

    teamIds.push(team._id);
  }

  return teamIds;
}

function buildPairings(format: LeagueFormat, entrantIds: string[]) {
  switch (format) {
    case 'round_robin':
      return generateRoundRobinPairings(entrantIds);
    case 'ladder':
      return generateLadderPairings(entrantIds);
    case 'bracket':
      return generateBracketPairings(entrantIds);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

function scoresheetPayloadForMatch(
  sport: Sport,
  entrantType: EntrantType,
  homeWins: boolean
): Record<string, unknown> {
  if (sport === 'pool') {
    return entrantType === 'player'
      ? { homeRaceWins: homeWins ? 5 : 2, awayRaceWins: homeWins ? 2 : 5 }
      : { homeRaceWins: homeWins ? 5 : 2, awayRaceWins: homeWins ? 2 : 4 };
  }

  if (sport === 'darts') {
    return entrantType === 'player'
      ? { homeLegsWon: homeWins ? 2 : 1, awayLegsWon: homeWins ? 1 : 2 }
      : { homeLegsWon: homeWins ? 5 : 2, awayLegsWon: homeWins ? 2 : 5 };
  }

  return { homeSetWins: homeWins ? 2 : 0, awaySetWins: homeWins ? 0 : 2 };
}

async function generateSchedule(
  league: {
    _id: mongoose.Types.ObjectId;
    sport: Sport;
    format: LeagueFormat;
    entrantType: EntrantType;
    poolFormat?: PoolFormat;
  },
  divisionId: mongoose.Types.ObjectId,
  entrantIds: string[],
  options: { poolFormat?: PoolFormat; raceTo?: number }
): Promise<void> {
  const pairings = buildPairings(league.format, entrantIds);

  if (pairings.length === 0) {
    throw new Error(`No pairings generated for ${league.sport} ${league.format}`);
  }

  const playerEntrantLeague = league.entrantType === 'player';
  const matchTime = parseMatchTime('19:00');
  const startDate = scheduleStartDate();
  const roundIntervalDays = league.format === 'bracket' ? 3 : 7;

  const matchDocs = pairings.map((pairing) => {
    const participants = playerEntrantLeague
      ? {
          homePlayerId: new mongoose.Types.ObjectId(pairing.homeTeamId),
          awayPlayerId: new mongoose.Types.ObjectId(pairing.awayTeamId),
        }
      : {
          homeTeamId: new mongoose.Types.ObjectId(pairing.homeTeamId),
          awayTeamId: new mongoose.Types.ObjectId(pairing.awayTeamId),
        };

    const base = {
      sport: league.sport,
      leagueId: league._id,
      divisionId,
      ...participants,
      roundNumber: pairing.roundNumber,
      scheduledAt: scheduledAtForRound({
        startDate,
        roundNumber: pairing.roundNumber,
        roundIntervalDays,
        matchTime,
      }),
      status: 'scheduled' as const,
    };

    if (league.sport === 'darts') {
      return {
        ...base,
        dartsFormat: '501' as const,
        legsToWin: 2,
        isDoubles: false,
      };
    }

    if (league.sport === 'volleyball') {
      return { ...base, setsToWin: 2 as const };
    }

    if (league.sport === 'pool') {
      return {
        ...base,
        poolFormat: options.poolFormat ?? '8_ball',
        ...(playerEntrantLeague ? { raceTo: options.raceTo ?? DEFAULT_POOL_PLAYER_RACE_TO } : {}),
      };
    }

    return base;
  });

  if (league.sport === 'pool') {
    await PoolMatch.insertMany(matchDocs);
  } else if (league.sport === 'darts') {
    await DartsMatch.insertMany(matchDocs);
  } else if (league.sport === 'volleyball') {
    await VolleyballMatch.insertMany(matchDocs);
  } else {
    await Match.insertMany(matchDocs);
  }
}

async function finalizeMatches(
  leagueId: mongoose.Types.ObjectId,
  sport: Sport,
  entrantType: EntrantType,
  mode: 'round1' | 'all'
): Promise<number> {
  const query =
    mode === 'round1'
      ? { leagueId, roundNumber: 1, status: 'scheduled' }
      : { leagueId, status: 'scheduled' };

  const matches = await Match.find(query).sort({ roundNumber: 1, scheduledAt: 1 });
  let finalized = 0;

  for (const [index, match] of matches.entries()) {
    const homeWins = index % 2 === 0;
    const payload = scoresheetPayloadForMatch(sport, entrantType, homeWins);
    await finalizeMatchFromPayload(match, payload);
    finalized += 1;
  }

  return finalized;
}

async function seedLeague(
  config: LeagueSeedConfig,
  allPlayerIds: mongoose.Types.ObjectId[]
): Promise<{ leagueId: string; name: string; matchesFinalized: number }> {
  const { seasonStart, seasonEnd } = seasonDates(config.kind);

  const league = await League.create({
    sport: config.sport,
    name: config.name,
    seasonStart,
    seasonEnd,
    kind: config.kind,
    entrantType: config.entrantType,
    format: config.format,
    status: 'active',
    poolFormat: config.poolFormat,
  });

  const divisionPayload: {
    leagueId: mongoose.Types.ObjectId;
    name: string;
    order: number;
    playerIds?: mongoose.Types.ObjectId[];
    handicapRules?: { system: 'apa'; skillLevelRange: [number, number] };
  } = {
    leagueId: league._id,
    name: config.divisionName,
    order: 0,
  };

  let entrantIds: string[] = [];

  if (config.entrantType === 'player') {
    const playerIds = tournamentPlayerIds(allPlayerIds);
    divisionPayload.playerIds = playerIds;
    if (config.sport === 'pool' && config.kind === 'tournament') {
      divisionPayload.handicapRules = { system: 'apa', skillLevelRange: [3, 6] };
    }
    entrantIds = playerIds.map((id) => String(id));
  }

  const division = await Division.create(divisionPayload);

  if (config.entrantType === 'team') {
    const teamIds = await createTeamsForLeague(league._id, division._id, config.sport, allPlayerIds);
    entrantIds = teamIds.map((id) => String(id));
  }

  await generateSchedule(
    {
      _id: league._id,
      sport: config.sport,
      format: config.format,
      entrantType: config.entrantType,
      poolFormat: config.poolFormat,
    },
    division._id,
    entrantIds,
    { poolFormat: config.poolFormat, raceTo: config.raceTo }
  );

  const finalizeMode = config.kind === 'tournament' ? 'all' : 'round1';
  const matchesFinalized = await finalizeMatches(
    league._id,
    config.sport,
    config.entrantType,
    finalizeMode
  );

  await recomputeStandingsForLeague(league._id);

  return {
    leagueId: String(league._id),
    name: config.name,
    matchesFinalized,
  };
}

async function seedLeaguesDemo(): Promise<void> {
  const establishmentSlug = loadEstablishmentConfig().slug ?? 'default';

  await connectDatabase();
  await clearDemoData();
  await ensureSportsEnabled();

  const playerIds = await createDemoPlayers(establishmentSlug);
  console.log(`Created ${playerIds.length} demo players (${DEMO_EMAIL_DOMAIN}).`);

  const results: Array<{ leagueId: string; name: string; matchesFinalized: number }> = [];

  for (const config of DEMO_LEAGUES) {
    const result = await seedLeague(config, playerIds);
    results.push(result);
    console.log(`  ✓ ${result.name} — ${result.matchesFinalized} match(es) finalized`);
  }

  console.log('\nDemo leagues ready. Visit /leagues on the public site.\n');
  console.log('League IDs (for admin / public URLs):');
  for (const result of results) {
    console.log(`  ${result.name}`);
    console.log(`    /leagues/${result.leagueId}`);
    console.log(`    /admin/leagues/${result.leagueId}`);
  }

  console.log('\nTournament test players (last 8 demo players — use with seedPlayer.ts):');
  const tournamentPlayers = tournamentPlayerIds(playerIds);
  const tournamentPlayerDocs = await Player.find({ _id: { $in: tournamentPlayers } })
    .select('_id name email')
    .lean();

  for (const player of tournamentPlayerDocs) {
    console.log(`  ${player.name} — ${player._id} (${player.email})`);
  }

  await mongoose.disconnect();
}

seedLeaguesDemo().catch(async (error) => {
  console.error('seedLeaguesDemo failed:', error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
