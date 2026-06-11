# Context: Public Site Components — Barry O's

Paste at the start of a Cursor session when building or editing public-facing React components.

---

## What You're Building

A dark, Irish pub aesthetic marketing site. One page, scrollable sections.
Design language: deep greens, warm golds, Anton/Oswald/Kaushan Script fonts.
Reference the static mockup: `barry-os-tavern.html` and `barry-os-event-states.html`.

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

## Component Map

```
src/components/public/
├── Nav/               sticky, scrolled state, brand + social links
├── Hero/              video + fallback gradient + unmute button
├── AnnouncementBar/   green strip; renders null when disabled
├── EventsSection/     decides: EventsGrid OR EvergreenPanel
│   ├── EventsGrid/    event cards with date, type tag, title, time, desc
│   ├── EventCard/     single card
│   └── EvergreenPanel/ evergreen fallback (3 pillars + CTAs)
├── ChristmasCTA/      Christmas party banner; renders null when disabled
├── Gallery/           approved photo grid
├── SubmitPhotoForm/   consent-gated submission form
└── Footer/            hours, address, phone, about
```

## Key Components

### AnnouncementBar

```tsx
// Renders null when disabled — no empty shell
interface AnnouncementBarProps {
  enabled: boolean;
  message: string;
  linkTarget: string;
}

export function AnnouncementBar({ enabled, message, linkTarget }: AnnouncementBarProps) {
  if (!enabled) return null;
  return (
    <div className="announce">
      {/* green gradient strip */}
      <span>{message}</span>
      <a href={`#${linkTarget.toLowerCase()}`}>{linkTarget} →</a>
    </div>
  );
}
```

### EventsSection — THE CRITICAL DUAL STATE

```tsx
interface Event {
  _id: string;
  type: 'sports' | 'holiday' | 'shuttle' | 'community';
  title: string;
  date: string; // ISO
  timeLabel: string;
  description: string;
}

export function EventsSection() {
  const { events, loading } = useEvents(); // GET /api/events (upcoming only)

  if (loading) return <EventsSkeleton />;

  return (
    <section id="events" className="section">
      <div className="wrap">
        <SectionHeading>What's On at Barry O's</SectionHeading>
        {events.length > 0
          ? <EventsGrid events={events} />
          : <EvergreenPanel />
        }
      </div>
    </section>
  );
}
```

**Never** show an empty state or error message. If `events.length === 0`, show EvergreenPanel.

### EvergreenPanel

Three pillars, always true: "Every Game On", "Cold Pints, Always", "Open 7 Days".
Plus a soft nudge to follow for updates.
See `barry-os-event-states.html` for the exact look — copy it faithfully.

### ChristmasCTA

```tsx
// Renders null when disabled
export function ChristmasCTA({ settings }: { settings: SiteSettings }) {
  if (!settings.christmasParty.enabled) return null;
  const { title, date, note, ticketUrl } = settings.christmasParty;
  // ... render the green gradient Christmas banner with ticket CTA
}
```

### SubmitPhotoForm

Consent is required both in UI and on the server. The form should:
1. Show the consent text in full (copy from spec)
2. Disable the Submit button until checkbox is checked
3. Accept one image file (JPEG/PNG/WebP, show preview)
4. POST multipart to `/api/submissions`
5. On success → redirect to `/thank-you`
6. On error → show the error message in plain English

```tsx
const CONSENT_TEXT = `I took this photo (or have permission to share it),
everyone pictured is okay with it being posted, and I give Barry O's
permission to use it on their website and social media.`;
```

---

## Custom Hook: useEvents

```typescript
// src/hooks/useEvents.ts
import { useEffect, useState } from 'react';
import { getEvents } from '../services/events';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { events, loading, error };
}
```

## Custom Hook: useSiteSettings

```typescript
// src/hooks/useSiteSettings.ts
import { useEffect, useState } from 'react';
import { getSiteSettings } from '../services/settings';

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSiteSettings().then(setSettings).finally(() => setLoading(false));
  }, []);

  return { settings, loading };
}
```

---

## Public API Services

```typescript
// src/services/api.ts — base client (no auth, public reads)
const BASE = import.meta.env.VITE_API_URL;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json.data;
}

// src/services/events.ts
export const getEvents = () => get<Event[]>('/events');

// src/services/settings.ts
export const getSiteSettings = () => get<SiteSettings>('/site');

// src/services/gallery.ts
export const getGallery = () => get<Submission[]>('/gallery');
```

---

## Responsive Breakpoints

- Mobile: < 560px (single column, stacked sections)
- Tablet: 560–900px (2-col events, 3-col gallery)
- Desktop: > 900px (full layout as per mockup)

The nav hides links on mobile; burger menu is a v2 enhancement.

---

## DO NOT

- Use placeholder "no events" text. Use EvergreenPanel.
- Render a gallery tile from a pending or rejected submission.
- Show an empty AnnouncementBar shell. Render null.
- Use hardcoded content — everything comes from the API.
- Use inline styles for brand colors — always CSS variables.
