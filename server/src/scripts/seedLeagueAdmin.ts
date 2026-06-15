import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDatabase } from '../config/db';
import { User } from '../models';

async function seedLeagueAdmin(): Promise<void> {
  const auth0Sub = process.env.LEAGUE_ADMIN_AUTH0_SUB;
  const email = process.env.LEAGUE_ADMIN_EMAIL;
  const name = process.env.LEAGUE_ADMIN_NAME;

  if (!auth0Sub || !email || !name) {
    console.error(
      'Missing required env vars: LEAGUE_ADMIN_AUTH0_SUB, LEAGUE_ADMIN_EMAIL, and LEAGUE_ADMIN_NAME must be set in server/.env'
    );
    process.exit(1);
  }

  await connectDatabase();

  const user = await User.findOneAndUpdate(
    { auth0Sub },
    { auth0Sub, email, name, role: 'league_admin' },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  console.log(`League admin user upserted: ${user.email} (${user.role})`);

  await mongoose.disconnect();
  process.exit(0);
}

seedLeagueAdmin().catch((error) => {
  console.error('seedLeagueAdmin failed:', error);
  process.exit(1);
});
