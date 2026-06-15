import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDatabase } from '../config/db';
import { Player, User } from '../models';

async function seedCaptain(): Promise<void> {
  const auth0Sub = process.env.CAPTAIN_AUTH0_SUB;
  const email = process.env.CAPTAIN_EMAIL;
  const name = process.env.CAPTAIN_NAME;
  const playerId = process.env.CAPTAIN_PLAYER_ID;

  if (!auth0Sub || !email || !name || !playerId) {
    console.error(
      'Missing required env vars: CAPTAIN_AUTH0_SUB, CAPTAIN_EMAIL, CAPTAIN_NAME, and CAPTAIN_PLAYER_ID must be set in server/.env'
    );
    process.exit(1);
  }

  if (!mongoose.isValidObjectId(playerId)) {
    console.error('CAPTAIN_PLAYER_ID must be a valid MongoDB ObjectId');
    process.exit(1);
  }

  await connectDatabase();

  const player = await Player.findById(playerId);

  if (!player) {
    console.error(`Player not found: ${playerId}`);
    process.exit(1);
  }

  const user = await User.findOneAndUpdate(
    { auth0Sub },
    { auth0Sub, email, name, role: 'captain', playerId: player._id },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  if (player.auth0Sub !== auth0Sub) {
    player.auth0Sub = auth0Sub;
    await player.save();
  }

  console.log(`Captain user upserted: ${user.email} → player ${player.name} (${player._id})`);

  await mongoose.disconnect();
  process.exit(0);
}

seedCaptain().catch((error) => {
  console.error('seedCaptain failed:', error);
  process.exit(1);
});
