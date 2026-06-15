# Context: Public Site Components — Barry O's

Paste at the start of a Cursor session when building or editing public-facing React components.

---

## What You're Building

A dark, Irish pub aesthetic marketing site. Primary home page plus dedicated routes for calendar, photo submit, and Christmas tickets.
Design language: deep greens, warm golds, Anton/Oswald/Kaushan Script fonts.

## Design Tokens (import from `src/styles/tokens.css`)

```css
:root {
  --bg:           #070a07;
  --panel:        #0f140f;
  --panel-2:      #131913;
  --green:        #1f9c4d;
  --green-bright: #27b85c;
  --green-deep:   #0f5c2e;
  --gold:         #c9a44c;
  --amber:        #e0a93c;
  --red:          #e25555;
  --text:         #f1f4f0;
  --muted:        #8b988d;
  --line:         rgba(255,255,255,.08);
  --green-line:   rgba(39,184,92,.3);
}
/* Fonts: Anton (display), Barlow (body), Kaushan Script (brand), Oswald (labels/UI) */
```

## Public Routes

```
/                → HomePage
/calendar        → CalendarPage (full event schedule)
/submit          → SubmitPage
/thank-you       → ThankYouPage
/christmas-party → ChristmasTicketsPage
```

## Component Map

```
src/components/public/
├── Nav/                   brand logo; Events → /calendar; Contact modal; Share a Photo
├── Hero/                  video + fallback gradient
├── AnnouncementBar/       green strip; renders null when disabled
├── EventsSection/         decides: EventsGrid OR EvergreenPanel
│   ├── EventsGrid/        compact event cards + "View Full Calendar" link
│   ├── EventCard/         single card (dated, multi-day, or weekly eyebrow)
│   └── EvergreenPanel/    evergreen fallback (3 pillars + CTAs)
├── EventCalendarList/     full calendar rows grouped by month
├── ChristmasCTA/          Christmas party banner; renders null when disabled
├── Gallery/               approved photo grid
├── ContactModal/          hours, address, phone
└── Footer/                hours, address, phone, about

src/pages/public/
├── HomePage.tsx
├── CalendarPage.tsx
├── SubmitPage.tsx
├── ThankYouPage.tsx
└── ChristmasTicketsPage.tsx
```

## Key Components

### AnnouncementBar

Renders `null` when disabled — no empty shell.

```tsx
interface AnnouncementBarProps {
  enabled: boolean;
  message: string;
  linkTarget: 'Events' | 'Christmas Party' | 'Menu' | 'Contact';
}
```

### EventsSection — THE CRITICAL DUAL STATE

```tsx
export function EventsSection() {
  const { events, loading } = useEvents(); // GET /api/events (upcoming only)

  if (loading) return <EventsSkeleton />;

  return (
    <section id="events" className="section">
      <div className="wrap">
        <h2 className="sec-head">What's On at Barry O's</h2>
        {events.length > 0
          ? <EventsGrid events={events} />   // includes Link to="/calendar"
          : <EvergreenPanel />
        }
      </div>
    </section>
  );
}
```

**Never** show an empty state or error message. If `events.length === 0`, show EvergreenPanel.

### Event display by schedule type

| scheduleType | Card eyebrow | Calendar page |
|---|---|---|
| `dated` | `JUN 15` | Full date + description |
| `multi_day` | `THU–SUN` | Weekday span + date range + description |
| `weekly` | `MONDAYS` | "Every Week" section + season range |

Helpers: `formatSpecificDateLabel`, `formatWeekdayRange`, `formatWeeklyDayLabel`, `formatDateRange` in `constants/eventSchedule.ts`.

### CalendarPage

Dedicated full schedule at `/calendar`. Uses `EventCalendarList` for detailed rows. Empty state reuses `EvergreenPanel`.

### EvergreenPanel

Three pillars: "Every Game On", "Cold Pints, Always", "Open 7 Days".
Plus CTAs to follow for updates and open contact/hours.

### ChristmasCTA

Renders `null` when `settings.christmasParty.enabled` is false. Links to `/christmas-party` for tickets.

### SubmitPage

Consent is required both in UI and on the server:

1. Show consent text in full
2. Disable Submit until checkbox is checked
3. Accept one image (JPEG/PNG/WebP, preview, max 8 MB)
4. POST multipart to `/api/submissions`
5. On success → redirect to `/thank-you`

```tsx
const CONSENT_TEXT = `I took this photo (or have permission to share it),
everyone pictured is okay with it being posted, and I give Barry O's
permission to use it on their website and social media.`;
```

---

## Custom Hooks

```typescript
useEvents()        → GET /api/events (upcoming only, all schedule types)
useSiteSettings()  → GET /api/site
```

---

## Public API Services

```typescript
// src/services/events.ts
export async function getEvents(): Promise<Event[]>

// src/services/settings.ts — via useSiteSettings
GET /api/site

// src/services/gallery.ts
GET /api/gallery

// src/services/submissions.ts
POST /api/submissions  (multipart, no auth)
```

---

## Responsive Breakpoints

- Mobile: < 560px (single column, stacked sections)
- Tablet: 560–900px (2-col events, 3-col gallery)
- Desktop: > 900px (full layout)

---

## DO NOT

- Use placeholder "no events" text. Use EvergreenPanel.
- Render a gallery tile from a pending or rejected submission.
- Show an empty AnnouncementBar shell. Render null.
- Use hardcoded content — everything comes from the API.
- Use inline styles for brand colors — always CSS variables.
- Link "View Full Calendar" to `#events` — it goes to `/calendar`.
