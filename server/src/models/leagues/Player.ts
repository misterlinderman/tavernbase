import mongoose, { Document, Schema } from 'mongoose';

export interface IPlayer extends Document {
  name: string;
  email?: string;
  phone?: string;
  auth0Sub?: string;
  captainInvitedAt?: Date;
  establishmentSlug: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlayerSchema = new Schema<IPlayer>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    auth0Sub: { type: String, sparse: true, unique: true },
    captainInvitedAt: { type: Date },
    establishmentSlug: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

PlayerSchema.index(
  { establishmentSlug: 1, email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string', $ne: '' } } }
);

export const Player = mongoose.model<IPlayer>('Player', PlayerSchema);
