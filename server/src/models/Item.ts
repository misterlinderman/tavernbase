import mongoose, { Document, Schema } from 'mongoose';

export interface IItem extends Document {
  title: string;
  description?: string;
  completed: boolean;
  user: string; // Auth0 user ID
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema<IItem>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    completed: {
      type: Boolean,
      default: false,
    },
    user: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user queries
itemSchema.index({ user: 1, createdAt: -1 });

export const Item = mongoose.model<IItem>('Item', itemSchema);
