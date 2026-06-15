import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDatabase } from '../config/db';
import { Player, Team, User } from '../models';

async function seedPlayer(): Promise<void> {
  const auth0Sub = process.env.PLAYER_AUTH0_SUB;
  const email = process.env.PLAYER_EMAIL;
  const name = process.env.PLAYER_NAME;
  const playerId = process.env.PLAYER_PLAYER_ID;

  if (!auth0Sub || !email || !name || !playerId) {
    console.error(
      'Missing required env vars: PLAYER_AUTH0_SUB, PLAYER_EMAIL, PLAYER_NAME, and PLAYER_PLAYER_ID must be set in server/.env'
    );
    process.exit(1);
  }

  if (!mongoose.isValidObjectId(playerId)) {
    console.error('PLAYER_PLAYER_ID must be a valid MongoDB ObjectId');
    process.exit(1);
  }

  await connectDatabase();

  const player = await Player.findById(playerId);

  if (!player) {
    console.error(`Player not found: ${playerId}`);
    process.exit(1);
  }

  const onRoster = await Team.exists({ playerIds: player._id });

  if (!onRoster) {
    console.error('Player must be on at least one team roster (team.playerIds) before seeding');
    process.exit(1);
  }

  const user = await User.findOneAndUpdate(
    { auth0Sub },
    { auth0Sub, email, name, role: 'player', playerId: player._id },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  if (player.auth0Sub !== auth0Sub) {
    player.auth0Sub = auth0Sub;
    await player.save();
  }

  console.log(`Player user upserted: ${user.email} → player ${player.name} (${player._id})`);

  await mongoose.disconnect();
  process.exit(0);
}

seedPlayer().catch((error) => {
  console.error('seedPlayer failed:', error);
  process.exit(1);
});
