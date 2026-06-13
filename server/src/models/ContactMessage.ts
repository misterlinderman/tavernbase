import mongoose, { Document, Schema } from 'mongoose';

export interface IContactMessage extends Document {
  email: string;
  phone?: string;
  message: string;
  submitterIpHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContactMessageSchema = new Schema<IContactMessage>(
  {
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 30 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    submitterIpHash: { type: String },
  },
  { timestamps: true },
);

ContactMessageSchema.index({ createdAt: -1 });

export const ContactMessage = mongoose.model<IContactMessage>(
  'ContactMessage',
  ContactMessageSchema,
);
