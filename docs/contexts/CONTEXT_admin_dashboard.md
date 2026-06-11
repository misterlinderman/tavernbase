# Context: Admin Dashboard — Barry O's

Paste at the start of a Cursor session when building staff dashboard pages or editors.

---

## What the Dashboard Is

A staff-only SPA for managing all site content. Non-technical users (owner, bartenders, a trusted regular).
Every editable element has a live preview matching the public site.
Language is plain: "Showing on site" / "Hidden" — never "enabled" / "disabled".

## Auth

All dashboard routes require Auth0 authentication. Use `useAuth0()` for the token; inject it into all API calls via the admin API service.

```typescript
// src/services/adminApi.ts
import { useAuth0 } from '@auth0/auth0-react';

// Hook version — use inside components
export function useAdminApi() {
  const { getAccessTokenSilently } = useAuth0();

  async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const token = await getAccessTokenSilently();
    const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });
    if (!res.ok) throw new Error(await res.text());
    const json = await res.json();
    return json.data;
  }

  return { adminFetch };
}
```

## Route Map

```
/admin              → Overview (default redirect)
/admin/submissions  → ModerationQueue
/admin/events       → EventManager
/admin/announcement → AnnouncementEditor
/admin/christmas    → ChristmasEditor
/admin/hours        → HoursEditor
/admin/media        → MediaEditor
```

## Admin Layout Shell

```tsx
// Sidebar navigation items (in order)
const NAV_ITEMS = [
  { path: '/admin',              label: 'Overview',          icon: 'grid' },
  { path: '/admin/submissions',  label: 'Photo Submissions', icon: 'camera', badgeKey: 'pendingCount' },
  { path: '/admin/events',       label: 'Events',            icon: 'calendar' },
  { path: '/admin/announcement', label: 'Announcement Bar',  icon: 'megaphone' },
  { path: '/admin/christmas',    label: 'Christmas Party',   icon: 'star' },
  { path: '/admin/hours',        label: 'Hours & Info',      icon: 'clock' },
  { path: '/admin/media',        label: 'Media & Social',    icon: 'image' },
];
```

The pending submission count badge appears on "Photo Submissions". Fetch it with `GET /api/admin/submissions?status=pending` and use the count from the response meta.

## Overview Page

Four stat cards (clickable, link to sub-page):
1. Photos to review (pending count) — amber color when > 0
2. Upcoming events (count) — green
3. Announcement bar (On/Off)
4. Days to Christmas party (or "Off")

Below: "Needs your attention" — pending submissions needing review.
Below: "Live on the site" — what's currently active (announcement, events count, Christmas CTA).

## Events Page

Two sections:
1. **Add Event form** — type (dropdown), date, time, title, description. Submit creates via POST /api/admin/events.
2. **Event list** — all events sorted by date. Past events shown at 55% opacity with a "Past · hidden" pill. Delete button on each.

```tsx
const EVENT_TYPES = [
  { value: 'sports',    label: 'Sports / Watch party' },
  { value: 'holiday',   label: 'Holiday' },
  { value: 'shuttle',   label: 'Game-day shuttle' },
  { value: 'community', label: 'Community / Potluck' },
];
```

## Announcement Editor

Two pieces:
1. Toggle: "Showing on site" / "Hidden"
2. Message text input (with character count, ~160 char recommended)
3. Link target dropdown: Events / Christmas Party / Menu / Contact
4. **Live preview** — rendered exactly as the public site announcement bar

The preview updates as the user types. Do NOT debounce the preview — it should feel instant.

## Christmas Editor

1. Toggle: "Showing on site" / "Hidden"
2. Headline text
3. Date picker
4. Note text
5. Ticket URL (validated as URL format)
6. Computed "X days away" display (read-only)
7. **Live preview** — Christmas CTA banner exactly as it appears on the site

## Hours Editor

A list of editable rows: `[Day label] [Hours string] [Remove]` + "+ Add row" button.
These feed directly into the footer. No fixed slots — the staff can add/remove rows freely.

```tsx
// Default state
const DEFAULT_HOURS = [
  { label: 'Mon – Thu', value: '11AM – 2AM' },
  { label: 'Fri – Sat', value: '11AM – 2:30AM' },
  { label: 'Sun',       value: '11AM – 2AM' },
];
```

Save button PUTs to /api/admin/site. Show toast on success.

## Media Page

1. **Hero video** — current filename (read-only), upload button triggers multipart POST to /api/admin/media/hero.
2. **Instagram handle** — text input, PUT to /api/admin/site on save.
3. **Gallery toggle** — "Show approved submissions in gallery" checkbox.
4. Link to submissions queue.

---

## Admin API Routes Reference

```typescript
// GET /api/admin/submissions?status=pending|approved|rejected
// PATCH /api/admin/submissions/:id  body: { status: 'approved'|'rejected'|'pending' }
// DELETE /api/admin/submissions/:id

// GET /api/admin/events              (all, incl. past)
// POST /api/admin/events             body: EventInput
// PATCH /api/admin/events/:id        body: Partial<EventInput>
// DELETE /api/admin/events/:id

// GET /api/admin/site                (full SiteSettings)
// PUT /api/admin/site                body: Partial<SiteSettings>

// POST /api/admin/media/hero         multipart: video file
```

## Toast Notifications

All save/approve/reject actions show a brief toast. Use a simple context-based toast:

```tsx
function toast(msg: string, type: 'success' | 'error' = 'success') { ... }
```

Toasts appear bottom-center, green for success, red for error, auto-dismiss after 1.8s.

## Design Rules for Dashboard

- Same CSS variables as public site — same dark palette, same fonts
- Panels: `background: var(--panel); border: 1px solid var(--line); border-radius: 12px;`
- Success green: `var(--green-bright)`, destructive red: `var(--red)`
- Pill badges for status: pending=amber, approved=green, rejected=red
- Buttons: Oswald font, uppercase, letter-spacing 0.08em
- All form labels: Oswald, uppercase, 11.5px, muted color
