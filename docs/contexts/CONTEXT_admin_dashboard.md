# Context: Admin Dashboard — Barry O's

Paste at the start of a Cursor session when building staff dashboard pages or editors.

---

## What the Dashboard Is

A staff-only SPA for managing all site content. Non-technical users (owner, bartenders, a trusted regular).
Every editable element has a live preview matching the public site where applicable.
Language is plain: "Showing on site" / "Hidden" — never "enabled" / "disabled".

## Auth

All dashboard routes require Auth0 authentication. Use `useAdminApi()` hook for authenticated fetch:

```typescript
// src/hooks/useAdminApi.ts
const { adminFetch } = useAdminApi();
const data = await adminFetch<Event[]>('/admin/events');
```

## Route Map

```
/admin              → Overview (default)
/admin/submissions  → ModerationQueue
/admin/events       → EventsPage
/admin/leagues      → Leagues overview + create
/admin/leagues/registrations → Registration approval queue (L12.4)
/admin/leagues/people → People directory — captains & players (L9.1)
/admin/leagues/:id  → League detail — registration, payments, schedule
/admin/announcement → AnnouncementPage
/admin/christmas    → ChristmasPage
/admin/hours        → HoursPage
/admin/media        → MediaPage
/admin/login        → LoginPage (unauthenticated)
```

Leagues sidebar items (**Leagues**, **Registrations**, **People**) appear when at least one sport is enabled in site settings.

### Registration queue (L12.4)

`/admin/leagues/registrations` — cross-league list filtered to pending approval, pending payment, and waitlisted. Bulk approve/reject. On approve/reject, API returns an email template; UI auto-copies to clipboard when Resend is not configured (see [SETUP.md](../../SETUP.md) §10).

Per-league registration list and payment ledger live on **League detail** → Registration settings section.

## Admin Layout Shell

```tsx
const NAV_ITEMS = [
  { path: '/admin',              label: 'Overview' },
  { path: '/admin/submissions',  label: 'Photo Submissions', badgeKey: 'pendingCount' },
  { path: '/admin/events',       label: 'Events' },
  { path: '/admin/announcement', label: 'Announcement Bar' },
  { path: '/admin/christmas',    label: 'Christmas Party' },
  { path: '/admin/hours',        label: 'Hours & Info' },
  { path: '/admin/media',        label: 'Media & Social' },
];
```

Pending submission count badge on "Photo Submissions". Fetched via overview or submissions endpoint.

## Overview Page

Four stat cards:
1. Photos to review (pending count)
2. Upcoming events (count)
3. Announcement bar (On/Off)
4. Days to Christmas party (or "Off")

Plus "Needs your attention" and "Live on the site" sections.

## Events Page

Two sections:

1. **Add / Edit event form** — schedule type picker + fields + submit
2. **All events list** — sorted by date; past events at 55% opacity with "Past · hidden" pill

### Schedule types (staff-facing labels)

| Value | Label | Required fields |
|---|---|---|
| `dated` | Specific date | `date` |
| `multi_day` | Multiple days | `startDate` (First day), `endDate` (Last day) |
| `weekly` | Weekly | `dayOfWeek`, `startDate`, `endDate` |

Help text for **Multiple days**: "Back-to-back days for one event — like a tournament running Thursday through Sunday."

### Event types (dropdown, grouped)

Watch parties (baseball, football, basketball), Game-day shuttles, Live music, Holiday, Community / Potluck.

See `client/src/constants/eventTypes.ts` for full list.

List pills: type badge, schedule badge ("Weekly" / "Multiple days"), "Starts later", "Live on site", "Past · hidden".

## Announcement Editor

1. Toggle: "Showing on site" / "Hidden"
2. Message text input
3. Link target dropdown: Events / Christmas Party / Menu / Contact
4. Live preview matching public AnnouncementBar

## Christmas Editor

1. Toggle, headline, date, note, ticket URL
2. Computed "X days away"
3. Live preview of Christmas CTA banner

## Hours Editor

Editable rows: `[Day label] [Hours string] [Remove]` + "+ Add row".
Also contact address, phone, about text. Save via PUT `/api/admin/site`.

## Media Page

1. Hero video upload → POST `/api/admin/media/hero`
2. Instagram handle
3. Gallery toggle: "Show approved submissions in gallery"

## Submissions / Moderation

Tabs: Pending | Approved | Rejected.

- **Approve** → moves Cloudinary asset pending → gallery; status `approved`
- **Reject** → status `rejected`; asset destroyed
- **Delete** → removes from DB + Cloudinary

No photo reaches the public gallery without explicit Approve click.

---

## Admin API Routes Reference

```typescript
GET    /api/admin/overview
GET    /api/admin/submissions?status=pending|approved|rejected
PATCH  /api/admin/submissions/:id   body: { status }
DELETE /api/admin/submissions/:id

GET    /api/admin/events
POST   /api/admin/events            body: EventInput (includes scheduleType)
PATCH  /api/admin/events/:id
DELETE /api/admin/events/:id

GET    /api/admin/site
PUT    /api/admin/site

POST   /api/admin/media/hero        multipart video
```

### EventInput schedule examples

```json
// Specific date
{ "scheduleType": "dated", "date": "2026-06-15", "type": "watch_party_baseball", "title": "...", "timeLabel": "6:30 PM" }

// Multiple days
{ "scheduleType": "multi_day", "startDate": "2026-06-12", "endDate": "2026-06-15", "type": "watch_party_baseball", "title": "College World Series", "timeLabel": "All day" }

// Weekly
{ "scheduleType": "weekly", "dayOfWeek": 1, "startDate": "2026-09-01", "endDate": "2026-12-31", "type": "watch_party_football", "title": "Monday Night Football", "timeLabel": "7:00 PM" }
```

## Toast Notifications

All save/approve/reject actions show a brief toast via `useToast()`. Success = green, error = red, auto-dismiss ~1.8s.

## Design Rules for Dashboard

- Same CSS variables as public site
- Panels: `background: var(--panel); border: 1px solid var(--line); border-radius: 12px;`
- Pill badges: pending=amber, approved=green, rejected=red, live=green
- Buttons: Oswald font, uppercase
- Form labels: Oswald, uppercase, muted color
