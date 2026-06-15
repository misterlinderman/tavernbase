import mongoose, { Document, Schema } from 'mongoose';

export interface ISiteSettings extends Document {
  announcement: {
    enabled: boolean;
    message: string;
    linkTarget: 'Events' | 'Christmas Party' | 'Menu' | 'Contact';
  };
  christmasParty: {
    enabled: boolean;
    title: string;
    date?: Date;
    note: string;
    ticketUrl: string;
  };
  hero: {
    videoUrl?: string;
    posterUrl?: string;
    headline: string;
    subheadline: string;
  };
  hours: Array<{ label: string; value: string; order: number }>;
  contact: { address: string; phone: string };
  tagline: string;
  about: string;
  instagram: { handle: string; showApprovedInGallery: boolean };
  sportsEnabled: {
    pool: boolean;
    darts: boolean;
    volleyball: boolean;
  };
}

const SiteSettingsSchema = new Schema<ISiteSettings>(
  {
    announcement: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: '' },
      linkTarget: {
        type: String,
        enum: ['Events', 'Christmas Party', 'Menu', 'Contact'],
        default: 'Events',
      },
    },
    christmasParty: {
      enabled: { type: Boolean, default: false },
      title: { type: String, default: 'Annual Christmas Party' },
      date: { type: Date },
      note: { type: String, default: '' },
      ticketUrl: { type: String, default: '' },
    },
    hero: {
      videoUrl: String,
      posterUrl: String,
      headline: { type: String, default: 'A Neighborhood Tradition', maxlength: 120 },
      subheadline: { type: String, default: 'Old Market Tavern', maxlength: 80 },
    },
    hours: [{ label: String, value: String, order: Number }],
    contact: { address: String, phone: String },
    tagline: {
      type: String,
      default: 'Good Times. Cold Drinks. Great People.',
      maxlength: 200,
    },
    about: { type: String, default: '', maxlength: 400 },
    instagram: {
      handle: { type: String, default: '' },
      showApprovedInGallery: { type: Boolean, default: true },
    },
    sportsEnabled: {
      pool: { type: Boolean, default: false },
      darts: { type: Boolean, default: false },
      volleyball: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const SiteSettings = mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema);
