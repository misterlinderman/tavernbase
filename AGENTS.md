# Agent context — Tavern Base

Use this file for fast orientation when editing this repository in an AI-assisted IDE.

## What this is

**Tavern Base** — a white-label MERN platform for neighborhood bars and taverns, forked from the Barry O's production site. The first live deployment is Barry O's; this repo is the base for pitching and onboarding additional establishments.

Each venue gets:

- **Public site** — marketing pages (read-mostly): home, event calendar, photo submit, Christmas tickets
- **Staff dashboard** — Auth0-gated SPA for all content management

**Owner is non-technical.** Dashboard copy must be plain English. An empty event calendar is normal — show EvergreenPanel, never an error.

## Stack

- **client**: Vite + React 18 + TypeScript + Tailwind + Auth0 SPA SDK
- **server**: Express + TypeScript + Mongoose + MongoDB; JWT validation on `/api/admin/*`
- **services**: Vercel (client) · Railway (server) · MongoDB Atlas · Auth0 · Cloudinary

Repository layout: **`client/` and `server/` at the repo root** (no wrapper folder).

## Commands (from repository root)

| Command | Purpose |
|---------|---------|
| `npm run install:all` | Install root, client, and server dependencies |
| `npm run dev` | Run API and Vite dev server together |
| `npm run dev:client` | Frontend only (port 5173) |
| `npm run dev:server` | API only (port 3001) |
| `npm run build` | Production build of client and server |
| `npm run lint` | ESLint in client and server |
| `npm run format` | Prettier for common file types |

## Public routes

```
/                    → HomePage
/calendar            → CalendarPage (full event list)
/submit              → SubmitPage
/thank-you           → ThankYouPage
/christmas-party     → ChristmasTicketsPage
/admin/login         → LoginPage
/admin               → Overview (protected)
/admin/submissions   → SubmissionsPage
/admin/events        → EventsPage
/admin/announcement  → AnnouncementPage
/admin/christmas     → ChristmasPage
/admin/hours         → HoursPage
/admin/media         → MediaPage
```

## Key features to know

### Events (three schedule types)

| Type | Staff label | Fields | Public display |
|------|-------------|--------|----------------|
| `dated` | Specific date | `date` | Single date on card (e.g. `JUN 15`) |
| `multi_day` | Multiple days | `startDate`, `endDate` | Weekday span (e.g. `THU–SUN`) + date range on calendar page |
| `weekly` | Weekly | `dayOfWeek`, `startDate`, `endDate` | Day label (e.g. `MONDAYS`) + season range |

Public API `GET /api/events` returns only **active upcoming** events. Logic lives in `server/src/utils/eventSchedule.ts` (mirrored in `client/src/constants/eventSchedule.ts` for display).

Homepage: `EventsSection` → `EventsGrid` (with link to `/calendar`) or `EvergreenPanel` when empty.

### Photo submissions

- `POST /api/submissions` — multipart, rate-limited, consent required server-side
- EXIF stripped via `sharp` before Cloudinary upload to `barryos/pending/`
- Approval moves asset to `barryos/gallery/`; only `status: 'approved'` appears in public gallery
- **Never auto-publish**

### Site settings (singleton)

Announcement bar, Christmas CTA, hero video, hours, contact, Instagram — all toggled via `SiteSettings` in MongoDB. Disabled components render `null` on the public site.

## Where to look

| Task | Location |
|------|----------|
| API routes | `server/src/routes/` |
| Event schedule logic | `server/src/utils/eventSchedule.ts` |
| Auth middleware | `server/src/middleware/auth.ts` |
| Image pipeline | `server/src/middleware/imagePipeline.ts` |
| Models | `server/src/models/` |
| App routes | `client/src/App.tsx` |
| Public components | `client/src/components/public/` |
| Admin pages | `client/src/pages/admin/` |
| API client | `client/src/services/` |
| Design tokens | `client/src/styles/tokens.css` |
| Architecture | `docs/architecture/ARCHITECTURE.md` |
| Full conventions | `.cursorrules`, `.cursor/rules/` |

## Env setup

Copy examples: `.env.example`, `client/.env.example`, `server/.env.example` → respective `.env` files. Copy `config/establishment.example.json` → `config/establishment.json` for venue identity. Configure MongoDB Atlas, Auth0, and Cloudinary before exercising authenticated or upload flows. See [SETUP.md](SETUP.md) and [docs/PLATFORM.md](docs/PLATFORM.md).

## Critical non-negotiables

1. No stranger-submitted photo on the public site without staff approval
2. Consent enforced server-side on submissions — never trust the UI alone
3. EXIF stripped from every uploaded image
4. All `/api/admin/*` routes require Auth0 JWT
5. Empty events calendar → EvergreenPanel, not an error state
6. Secrets in `.env` only — never in source
