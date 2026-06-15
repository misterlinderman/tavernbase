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
export interface IEvent extends Document {
  type: EventType;  // watch_party_*, shuttle_*, live_music, holiday, community, …
  scheduleType: 'weekly' | 'dated' | 'multi_day';
  title: string;
  description: string;
  date?: Date;           // single-day date OR sort anchor for weekly/multi_day
  dayOfWeek?: number;    // 0=Sun … 6=Sat (weekly only)
  startDate?: Date;      // weekly season start OR multi_day first day
  endDate?: Date;        // weekly season end OR multi_day last day
  timeLabel: string;     // display: "6:30 PM", "Doors at 11AM", etc.
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

**Schedule types:**

| scheduleType | Fields used | Public visibility |
|---|---|---|
| `dated` | `date` | Active when `date >= today` |
| `multi_day` | `startDate`, `endDate`, `date` (= startDate) | Active when `endDate >= today` |
| `weekly` | `dayOfWeek`, `startDate`, `endDate`, `date` (= startDate) | Active when in season and next occurrence exists |

**Key rule:** "Upcoming" is NOT a stored field. Public API filters via `getActiveEventsFilter()` and `filterActiveEventsForDisplay()` in `server/src/utils/eventSchedule.ts`. Past events remain in DB for admin; excluded from `GET /api/events`.

Indexes: `{ date: 1 }`, `{ scheduleType: 1, startDate: 1, endDate: 1 }`.

---

### Submission (UGC photos)

```typescript
export interface ISubmission extends Document {
  submitterName: string;
  submitterEmail?: string;
  caption: string;
  imageUrl: string;
  thumbnailUrl: string;
  cloudinaryPublicId: string;
  cloudinaryFolder: 'pending' | 'gallery';
  status: 'pending' | 'approved' | 'rejected';  // default 'pending'
  consent: boolean;            // MUST be true — enforced server-side
  consentText: string;         // snapshot of exact wording at submission time
  exifStripped: boolean;
  review?: { reviewedBy: ObjectId; reviewedAt: Date };
  submitterIpHash?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Critical:** Reject POST if `consent !== true`. Default status is always `'pending'`. Never auto-approve.

---

### SiteSettings (singleton)

```typescript
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
}
```

Bootstrapped on server start via find-or-create. Public API returns a subset via `toPublicSiteSettings()`.

---

### User

```typescript
export interface IUser extends Document {
  name: string;
  email: string;
  auth0Sub: string;   // Auth0 sub claim from JWT
  role: 'manager' | 'staff';
  createdAt: Date;
}
```

Auth0 manages identity; User stores role + profile metadata for authorization.

---

## Export index

```typescript
// server/src/models/index.ts
export { Event }        from './Event';
export { Submission }   from './Submission';
export { SiteSettings } from './SiteSettings';
export { User }         from './User';
```

---

## Related utilities

- `server/src/utils/eventSchedule.ts` — parse schedule input, active filters, sort order
- `server/src/constants/eventTypes.ts` — allowed event type enum
