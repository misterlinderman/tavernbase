import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'manager' | 'staff' | 'league_admin' | 'captain' | 'player';

export interface IUser extends Document {
  name: string;
  email: string;
  auth0Sub: string;
  role: UserRole;
  playerId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    auth0Sub: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ['manager', 'staff', 'league_admin', 'captain', 'player'],
      default: 'staff',
    },
    playerId: { type: Schema.Types.ObjectId, ref: 'Player' },
  },
  { timestamps: true }
);

UserSchema.index({ playerId: 1 }, { sparse: true });

export const User = mongoose.model<IUser>('User', UserSchema);
