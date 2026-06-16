import mongoose, { Document, Schema } from 'mongoose';

export type PendingInviteRole = 'captain' | 'player';

export interface IPendingInvite extends Document {
  playerId: mongoose.Types.ObjectId;
  email: string;
  role: PendingInviteRole;
  invitedBy?: mongoose.Types.ObjectId;
  invitedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PendingInviteSchema = new Schema<IPendingInvite>(
  {
    playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    role: { type: String, enum: ['captain', 'player'], required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    invitedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

PendingInviteSchema.index({ playerId: 1, role: 1 }, { unique: true });
PendingInviteSchema.index({ email: 1, role: 1 });

export const PendingInvite = mongoose.model<IPendingInvite>('PendingInvite', PendingInviteSchema);
