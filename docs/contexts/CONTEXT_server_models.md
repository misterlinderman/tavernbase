# Context: Server Models — Barry O's

Paste this at the start of a Cursor session when creating or editing Mongoose models.

---

## Project

Barry O's Old Market Tavern (Royal Oak, MI). MERN stack. Four collections: Event, Submission, SiteSettings, User.

## Stack in this context

- Node.js + Express + TypeScript
- Mongoose with MongoDB Atlas
- File: `server/src/models/`

## The Four Models

### Event

```typescript
// server/src/models/Event.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  type: 'sports' | 'holiday' | 'shuttle' | 'community';
  title: string;
  description: string;
  date: Date;
  timeLabel: string;       // display string: "6:30 PM", "Doors at 11AM", etc.
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>({
  type:        { type: String, enum: ['sports','holiday','shuttle','community'], required: true },
  title:       { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 400 },
  date:        { type: Date, required: true },
  timeLabel:   { type: String, default: 'TBD', maxlength: 60 },
  createdBy:   { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Index for the most common public query
EventSchema.index({ date: 1 });

export const Event = mongoose.model<IEvent>('Event', EventSchema);
```

**Key rule:** "Upcoming" is NOT a stored field. It's always a query filter: `{ date: { $gte: new Date() } }`. Past events stay in the DB for the admin to see; they're excluded from the public API.

---

### Submission (UGC photos)

```typescript
// server/src/models/Submission.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ISubmission extends Document {
  submitterName: string;
  submitterEmail?: string;
  caption: string;
  imageUrl: string;            // Cloudinary secure_url (pending or gallery folder)
  thumbnailUrl: string;
  cloudinaryPublicId: string;  // needed for rename/destroy operations
  cloudinaryFolder: 'pending' | 'gallery';
  status: 'pending' | 'approved' | 'rejected';
  consent: boolean;            // MUST be true — enforced server-side
  consentText: string;         // exact wording snapshot at time of submission
  exifStripped: boolean;
  review?: {
    reviewedBy: mongoose.Types.ObjectId;
    reviewedAt: Date;
  };
  submitterIpHash?: string;    // hashed IP for abuse tracing
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>({
  submitterName:    { type: String, required: true, trim: true, maxlength: 100 },
  submitterEmail:   { type: String, trim: true },
  caption:          { type: String, default: '', maxlength: 280 },
  imageUrl:         { type: String, required: true },
  thumbnailUrl:     { type: String },
  cloudinaryPublicId: { type: String, required: true },
  cloudinaryFolder: { type: String, enum: ['pending','gallery'], default: 'pending' },
  status:           { type: String, enum: ['pending','approved','rejected'],
                      default: 'pending', index: true },
  consent:          { type: Boolean, required: true },   // REJECT if false
  consentText:      { type: String, required: true },
  exifStripped:     { type: Boolean, default: true },
  review:           {
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt:  Date,
  },
  submitterIpHash:  { type: String },
}, { timestamps: true });

SubmissionSchema.index({ status: 1, createdAt: -1 });

export const Submission = mongoose.model<ISubmission>('Submission', SubmissionSchema);
```

**Critical:** `consent` must be validated server-side. If the request body has `consent !== true`, return 400 before creating the document.

---

### SiteSettings (singleton)

```typescript
// server/src/models/SiteSettings.ts
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
  hero: { videoUrl?: string; posterUrl?: string; };
  hours: Array<{ label: string; value: string; order: number; }>;
  contact: { address: string; phone: string; };
  about: string;
  instagram: { handle: string; showApprovedInGallery: boolean; };
}

const SiteSettingsSchema = new Schema<ISiteSettings>({
  announcement: {
    enabled:    { type: Boolean, default: false },
    message:    { type: String, default: '' },
    linkTarget: { type: String, enum: ['Events','Christmas Party','Menu','Contact'],
                  default: 'Events' },
  },
  christmasParty: {
    enabled:   { type: Boolean, default: false },
    title:     { type: String, default: 'Annual Christmas Party' },
    date:      { type: Date },
    note:      { type: String, default: '' },
    ticketUrl: { type: String, default: '' },
  },
  hero:    { videoUrl: String, posterUrl: String },
  hours:   [{ label: String, value: String, order: Number }],
  contact: { address: String, phone: String },
  about:   { type: String, default: '' },
  instagram: {
    handle:                { type: String, default: '' },
    showApprovedInGallery: { type: Boolean, default: true },
  },
}, { timestamps: true });

export const SiteSettings = mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema);
```

**Bootstrap on server start:**

```typescript
// services/settings.ts
export async function ensureSettings() {
  const existing = await SiteSettings.findOne();
  if (!existing) {
    await SiteSettings.create({
      hours: [
        { label: 'Mon – Thu', value: '11AM – 2AM',    order: 1 },
        { label: 'Fri – Sat', value: '11AM – 2:30AM', order: 2 },
        { label: 'Sun',       value: '11AM – 2AM',    order: 3 },
      ],
      contact: {
        address: '324 S. Main St., Royal Oak, MI 48067',
        phone:   '(248) 541-3539',
      },
    });
  }
}
```

---

### User

```typescript
// server/src/models/User.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  auth0Sub: string;   // Auth0's user ID (sub claim from JWT)
  role: 'manager' | 'staff';
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  auth0Sub: { type: String, required: true, unique: true },
  role:     { type: String, enum: ['manager','staff'], default: 'staff' },
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', UserSchema);
```

---

## Export index

```typescript
// server/src/models/index.ts
export { Event }        from './Event';
export { Submission }   from './Submission';
export { SiteSettings } from './SiteSettings';
export { User }         from './User';
```
