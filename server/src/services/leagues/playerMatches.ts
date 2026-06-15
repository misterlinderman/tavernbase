import type { Sport } from '../../constants/leagues';
import type { IMatch } from '../../models/leagues/Match';
import mongoose from 'mongoose';
import { Division, League, Match, Player, Scoresheet } from '../../models';
import type { ScoresheetSide } from '../../constants/leagues';
import { formatMatchSides, isPlayerMatch, loadParticipantNameMaps } from './matchLabels';
import { poolHandicapBadge } from './poolHandicap';
import { participantSideForPlayer } from './scoresheet';
import { resolveVolleyballSetsToWin } from './scoresheets/volleyball';

export type PlayerSubmissionState =
  | 'scheduled'
  | 'awaiting_you'
  | 'awaiting_opponent'
  | 'disputed'
  | 'final';

export async function enrichPlayerMatch(
  match: Record<string, unknown>,
  playerId: mongoose.Types.ObjectId
) {
  const typedMatch = match as unknown as IMatch;
  const entrantIds = [typedMatch.homePlayerId, typedMatch.awayPlayerId]
    .filter(Boolean)
    .map((id) => String(id));
  const { teamNameById, playerNameById } = await loadParticipantNameMaps([], entrantIds);
  const sides = formatMatchSides(typedMatch, teamNameById, playerNameById);

  const [division, league, sheets] = await Promise.all([
    Division.findById(match.divisionId).select('name handicapRules').lean(),
    League.findById(match.leagueId).select('name sport kind').lean(),
    Scoresheet.find({ matchId: match._id }).lean(),
  ]);

  const mySide = participantSideForPlayer(typedMatch, playerId);
  const homeSheet = sheets.find((sheet) => sheet.submittedBy === 'home');
  const awaySheet = sheets.find((sheet) => sheet.submittedBy === 'away');
  const mySheet = mySide === 'home' ? homeSheet : mySide === 'away' ? awaySheet : undefined;
  const opponentSheet = mySide === 'home' ? awaySheet : mySide === 'away' ? homeSheet : undefined;

  let submissionState: PlayerSubmissionState = 'scheduled';

  if (match.status === 'final') {
    submissionState = 'final';
  } else if (homeSheet?.status === 'disputed' || awaySheet?.status === 'disputed') {
    submissionState = 'disputed';
  } else if (!mySheet || mySheet.status === 'draft') {
    submissionState = opponentSheet?.status === 'submitted' ? 'awaiting_you' : 'scheduled';
  } else {
    submissionState = 'awaiting_opponent';
  }

  const canSubmit =
    match.status !== 'final' &&
    match.status !== 'cancelled' &&
    mySide !== null &&
    (!mySheet || mySheet.status === 'draft');

  const sport = (match.sport as Sport | undefined) ?? league?.sport;
  const poolMatch =
    sport === 'pool'
      ? (typedMatch as { poolFormat?: '8_ball' | '9_ball'; raceTo?: number })
      : undefined;

  return {
    ...match,
    leagueName: league?.name ?? 'League',
    sport,
    setsToWin:
      sport === 'volleyball' ? resolveVolleyballSetsToWin(typedMatch) : undefined,
    poolFormat: poolMatch?.poolFormat,
    raceTo: poolMatch?.raceTo,
    handicapLabel: poolHandicapBadge(division?.handicapRules),
    divisionName: division?.name ?? 'Division',
    ...sides,
    mySide,
    submissionState,
    canSubmit,
    scoresheets: {
      home: homeSheet ?? null,
      away: awaySheet ?? null,
    },
  };
}

export function playerMatchParticipantFilter(playerId: mongoose.Types.ObjectId) {
  return {
    $or: [{ homePlayerId: playerId }, { awayPlayerId: playerId }],
  };
}

export async function assertPlayerMatchParticipant(
  match: IMatch,
  playerId: mongoose.Types.ObjectId
): Promise<ScoresheetSide> {
  if (!isPlayerMatch(match)) {
    throw new Error('This is not an individual player match');
  }

  const side = participantSideForPlayer(match, playerId);

  if (!side) {
    throw new Error('Forbidden — not your match');
  }

  const player = await Player.findById(playerId).select('auth0Sub').lean();

  if (!player?.auth0Sub) {
    throw new Error('Your player login must be linked before submitting scores');
  }

  return side;
}
