import mongoose from 'mongoose';
import { Division, Player, Team, User } from '../../models';
import type { IUser } from '../../models/User';
import { getEstablishmentSlug } from '../../config/establishment';
import {
  hasOpenPlayerRegistration,
  resolveRegistrationPlayer,
} from './registrationPlayer';

export interface ActivatePlayerInput {
  auth0Sub: string;
  email: string;
  name?: string | null;
}

export async function activatePlayerFromAuth(input: ActivatePlayerInput): Promise<IUser> {
  const auth0Sub = input.auth0Sub.trim();
  const email = input.email.trim().toLowerCase();

  const existingBySub = await User.findOne({ auth0Sub });

  if (existingBySub) {
    if (existingBySub.role !== 'player' && existingBySub.role !== 'captain') {
      throw new Error('This Auth0 account is not registered as a league player');
    }

    if (!existingBySub.playerId) {
      throw new Error('Player account is missing a player link');
    }

    return existingBySub;
  }

  let player = await Player.findOne({ email });

  if (!player) {
    player = await resolveRegistrationPlayer(email);

    if (!player && (await hasOpenPlayerRegistration())) {
      player = await Player.create({
        name: input.name?.trim() || email.split('@')[0] || 'Player',
        email,
        establishmentSlug: getEstablishmentSlug(),
        auth0Sub,
      });
    }
  }

  if (!player) {
    throw new Error(
      'No league roster found for this email. Use the same email your league manager added, or register for an open tournament session.'
    );
  }

  const isTeamCaptain = await Team.exists({ captainPlayerId: player._id });

  if (isTeamCaptain) {
    throw new Error('Use the captain login — you are assigned as a team captain');
  }

  const onRoster = await Team.exists({ playerIds: player._id });
  const onDivisionEntrant = await Division.exists({ playerIds: player._id });
  const isRegistrationPlayer = Boolean(await resolveRegistrationPlayer(email));
  const openPlayerRegistration = await hasOpenPlayerRegistration();

  if (!onRoster && !onDivisionEntrant && !isRegistrationPlayer && !openPlayerRegistration) {
    throw new Error('This player is not entered in any league yet');
  }

  const existingPlayerUser = await User.findOne({ playerId: player._id, role: 'player' });

  if (existingPlayerUser && existingPlayerUser.auth0Sub !== auth0Sub) {
    throw new Error('This player profile is already linked to another login');
  }

  const emailOwner = await User.findOne({ email });

  if (emailOwner && emailOwner.auth0Sub !== auth0Sub) {
    throw new Error('This email is already linked to another account');
  }

  const user = await User.findOneAndUpdate(
    { auth0Sub },
    {
      auth0Sub,
      email,
      name: input.name?.trim() || player.name,
      role: 'player',
      playerId: player._id,
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  if (player.auth0Sub !== auth0Sub) {
    player.auth0Sub = auth0Sub;
    await player.save();
  }

  return user;
}

export async function playerBelongsToLeague(
  playerId: mongoose.Types.ObjectId | string,
  leagueId: mongoose.Types.ObjectId | string
): Promise<boolean> {
  const [onTeam, onDivision] = await Promise.all([
    Team.exists({ leagueId, playerIds: playerId }),
    Division.exists({ leagueId, playerIds: playerId }),
  ]);

  return Boolean(onTeam || onDivision);
}
