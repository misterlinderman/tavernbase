import type { IPlayer } from '../../models/leagues/Player';
import type { ITeam } from '../../models/leagues/Team';

export interface CaptainInviteResult {
  playerId: string;
  playerName: string;
  playerEmail: string;
  teamId: string;
  teamName: string;
  leagueId: string;
  loginUrl: string;
  invitedAt: string;
  alreadyLinked: boolean;
  instructions: string[];
  emailSubject: string;
  emailBody: string;
  delivery: 'auth0_email' | 'manual_copy';
  auth0EmailSent?: boolean;
}

function resolveLoginUrl(): string {
  const clientUrl = process.env.CLIENT_URL?.replace(/\/$/, '') ?? 'http://localhost:5173';
  return `${clientUrl}/captain/login`;
}

export function buildCaptainInviteResult(options: {
  player: Pick<IPlayer, '_id' | 'name' | 'email'>;
  team: Pick<ITeam, '_id' | 'name' | 'leagueId'>;
  alreadyLinked: boolean;
  invitedAt: Date;
  delivery?: 'auth0_email' | 'manual_copy';
  auth0EmailSent?: boolean;
}): CaptainInviteResult {
  const loginUrl = resolveLoginUrl();
  const playerEmail = options.player.email ?? '';
  const venueName = 'your tavern';

  const instructions = [
    `Assign ${options.player.name} as captain on team "${options.team.name}" (done).`,
    `Captain opens ${loginUrl} and signs in with Auth0 using ${playerEmail}.`,
    'On first login, their account links automatically — no Auth0 sub paste required.',
    'They will see only matches for teams they captain.',
  ];

  const emailSubject = `Captain login — ${options.team.name} league scoresheets`;
  const emailBody = [
    `Hi ${options.player.name},`,
    '',
    `You've been invited to submit match scoresheets for ${options.team.name}.`,
    '',
    `1. Open ${loginUrl}`,
    `2. Sign in with this email address: ${playerEmail}`,
    '3. Submit scores after each match — both captains must enter matching results.',
    '',
    'If you have trouble signing in, contact your league manager.',
    '',
    venueName,
  ].join('\n');

  return {
    playerId: String(options.player._id),
    playerName: options.player.name,
    playerEmail,
    teamId: String(options.team._id),
    teamName: options.team.name,
    leagueId: String(options.team.leagueId),
    loginUrl,
    invitedAt: options.invitedAt.toISOString(),
    alreadyLinked: options.alreadyLinked,
    instructions,
    emailSubject,
    emailBody,
    delivery: options.delivery ?? 'manual_copy',
    auth0EmailSent: options.auth0EmailSent,
  };
}
