# Tavern Base — System Architecture

**Stack:** MongoDB Atlas · Express · React (Vite) · Node.js  
**Services:** Vercel · Railway · Auth0 · Cloudinary  
**Last updated:** June 2026

---

## System Overview

Three authenticated experiences plus a public site share one Express API and one MongoDB database.

```
┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐
│  Public Site             │  │  Staff Dashboard          │  │  Captain / Player portals │
│  React (Vite)            │  │  React (Auth0 SPA)        │  │  React (Auth0 SPA)        │
│  Vercel                  │  │  /admin/*                 │  │  /captain · /player       │
└────────────┬─────────────┘  └─────────────┬────────────┘  └─────────────┬────────────┘
             │ read + submit                │ read/write/moderate         │ scoresheets / read-only
             └──────────────┬───────────────┴─────────────────────────────┘
                            ▼
               ┌────────────────────────┐
               │  Express REST API      │
               │  Node.js · Railway     │
               │  Port 3001             │
               └──────┬─────────┬───────┘
                       │         │
          ┌────────────┘         └────────────────┐
          ▼                                       ▼
┌──────────────────┐                 ┌─────────────────────────┐
│  MongoDB Atlas   │                 │  Cloudinary             │
│  Collections:    │                 │  pending/ · gallery/    │
│  · Event         │                 │  hero video             │
│  · Submission    │                 └─────────────────────────┘
│  · SiteSettings  │
│  · User          │
│  · League*       │  ← optional leagues module
└──────────────────┘

Auth flows:
  Staff   → Auth0 → JWT → checkJwt → /api/admin/*
  Captain → Auth0 → JWT → checkJwt → requireCaptain → /api/captain/*
  Player  → Auth0 → JWT → checkJwt → requirePlayer → /api/player/*
  Public  → no auth → /api/events, /api/site, /api/leagues, /api/submissions
```

**League collections** (when module enabled): `League`, `Division`, `Team`, `Player`, `Match` (sport discriminators: pool, darts, volleyball), `Scoresheet`, `StandingsSnapshot`.

**Licensing:** `config/establishment.json` → `modules.leagues` loaded at boot (`server/src/config/establishment.ts`). Staff `sportsEnabled` toggles cannot exceed the license tier.

---

## Client Architecture

### Routing

```
/                    → HomePage (public)
/calendar            → CalendarPage (public — full event schedule)
/submit              → SubmitPage (public — photo submission)
/thank-you           → ThankYouPage (public)
/christmas-party     → ChristmasTicketsPage (public)
/leagues             → LeaguesPage (public — when sports enabled)
/leagues/:leagueId   → LeaguePublicPage (public)
/captain/login       → CaptainLoginPage (unauthenticated)
/captain             → CaptainPage (protected — scoresheets)
/player/login        → PlayerLoginPage (unauthenticated)
/player              → PlayerPage (protected — read-only standings)
/admin/login         → LoginPage (unauthenticated)
/admin               → Overview (protected)
/admin/submissions   → SubmissionsPage (protected)
/admin/events        → EventsPage (protected)
/admin/leagues       → LeaguesPage (protected)
/admin/leagues/:id   → LeagueDetailPage (protected)
/admin/announcement  → AnnouncementPage (protected)
/admin/christmas     → ChristmasPage (protected)
/admin/hours         → HoursPage (protected)
/admin/media         → MediaPage (protected)
```

All `/admin/*`, `/captain`, and `/player` routes wrap with Auth0 `RequireAuth`. Unauthenticated users redirect to the respective login page.

### Component Tree (Public Site)

```
HomePage
├── <Nav />                    Events link → /calendar
├── <Hero />                   looping video + fallback gradient
├── <AnnouncementBar />        renders null when disabled
├── <EventsSection />
│   ├── <EventsGrid />         when upcoming events exist; "View Full Calendar" → /calendar
│   └── <EvergreenPanel />     when calendar is empty
├── <LeaguesSection />         when active leagues exist; link to /leagues (else null)
├── <ChristmasCTA />           renders null when disabled
├── <Gallery />                approved submissions only
└── <Footer />                 hours, address, phone, about

CalendarPage
├── <Nav />
├── <EventCalendarList />      dated, multi-day, and weekly events with full detail
└── <EvergreenPanel />         when no upcoming events
```

### Component Tree (Admin Dashboard)

```
AdminLayout
├── <Sidebar />                nav + pending badge
└── <Outlet />
    ├── Overview               stat cards + live status
    ├── SubmissionsPage
    │   └── <ModerationQueue tabs="pending|approved|rejected" />
    ├── EventsPage
    │   ├── Event form          add/edit with schedule type picker
    │   └── Event list          all events, past greyed
    ├── AnnouncementPage
    │   ├── <ToggleField />
    │   ├── <MessageField />
    │   └── <AnnouncementPreview />
    ├── ChristmasPage
    │   ├── <ToggleField />
    │   ├── <DateField />
    │   ├── <TicketUrlField />
    │   └── <ChristmasPreview />
    ├── HoursPage              editable hours rows
    ├── MediaPage              hero video swap, IG handle
    ├── LeaguesPage            sports toggles, overview, create league
    └── LeagueDetailPage       divisions, teams, schedule, import, disputes
```

### Component Tree (Captain / Player portals)

```
CaptainLayout
└── CaptainPage                upcoming matches → sport-specific scoresheet form

PlayerLayout
└── PlayerPage                 my leagues → read-only standings per division
```

### State Management

No global state library. Each page owns its data via custom hooks:

```typescript
useEvents()          → GET /api/admin/events  (admin) or /api/events (public)
useSubmissions(status) → GET /api/admin/submissions?status=
useSiteSettings()    → GET /api/admin/site   (admin) or /api/site (public)
```

Custom hooks handle loading/error/refetch. All mutations call service functions, then invalidate (refetch) their hook. No optimistic updates in v1 — correctness over speed.

### Event schedule types

Events support three `scheduleType` values. "Upcoming" is always computed at query time — never stored as a status field.

| scheduleType | Staff label | Key fields | Active when |
|---|---|---|---|
| `dated` | Specific date | `date` | Event date ≥ today |
| `multi_day` | Multiple days | `startDate`, `endDate` | End date ≥ today |
| `weekly` | Weekly | `dayOfWeek`, `startDate`, `endDate` | Within season and next occurrence exists |

Schedule logic: `server/src/utils/eventSchedule.ts` (mirrored in `client/src/constants/eventSchedule.ts`).

Public `GET /api/events` returns only active upcoming events, sorted by next occurrence/start date.

---

## Server Architecture

### Middleware Stack (per request)

```
Request
  → cors()
  → helmet()
  → express.json()
  → morgan (logging)
  → /api/submissions  → rateLimit → multer → imagePipeline → route handler
  → /api/admin/*      → checkJwt (Auth0) → requireRole (staff+) → route handler
  → /api/captain/*    → checkJwt → requireCaptain → route handler
  → /api/player/*     → checkJwt → requirePlayer → route handler
  → /api/leagues/*    → route handler (public read; licensed + enabled sports)
  → /api/*            → route handler
  → globalErrorHandler
Response
```

### Image Pipeline (POST /api/submissions)

```
multipart form data
  → multer (memoryStorage, 8MB limit, image/* only)
  → sharp: re-encode to JPEG, strip EXIF metadata
  → sharp: resize thumbnail (400px wide, same aspect)
  → cloudinary.uploader.upload (stream)
      folder: process.env.CLOUDINARY_PENDING_FOLDER
      resource_type: 'image'
  → cloudinary.uploader.upload (thumbnail stream)
  → Submission.create({ status: 'pending', consent: true, ... })
  → 201 { message: 'Received — we'll review it soon.' }
```

On **approve** (PATCH /api/admin/submissions/:id):
```
Submission.findById → verify status is 'pending'
→ cloudinary.uploader.rename(
    from: pending/{publicId},
    to:   gallery/{publicId}
  )
→ Submission.updateOne({ status: 'approved', imageUrl: newUrl })
→ 200
```

On **reject** or **delete**:
```
→ cloudinary.uploader.destroy(publicId)
→ Submission.updateOne({ status: 'rejected' })  // soft reject
→ or Submission.deleteOne + destroy             // hard delete
```

---

## Service Integrations

### Auth0

- Frontend: `@auth0/auth0-react` — `Auth0Provider` wraps the admin SPA subtree.
- Backend: `express-oauth2-jwt-bearer` — `checkJwt` middleware validates tokens against Auth0 JWKS endpoint.
- User role is stored in MongoDB `User.role`. Auth0 manages identity; we manage authorization.

**Roles:**

| Role | Portal | API access |
|------|--------|------------|
| `manager` | `/admin` | Full admin + site settings + league write |
| `staff` | `/admin` | Dashboard read; league read; no league write |
| `league_admin` | `/admin/leagues` | League CRUD, disputes, import — no site settings |
| `captain` | `/captain` | Team-scoped scoresheet submit |
| `player` | `/player` | Read-only standings for rostered leagues |

**Staff login flow:**
```
Staff opens /admin/login
→ Auth0 Universal Login (hosted)
→ Callback to /admin (with token)
→ getAccessTokenSilently() injected into all admin API calls
→ Backend checkJwt validates; extracts sub (Auth0 user ID)
→ User.findOne({ auth0Sub }) for role
```

**Captain login flow:**
```
Captain opens /captain/login → Auth0 → /captain
→ POST /api/captain/activate (links auth0Sub to Player via email)
→ requireCaptain on subsequent requests
→ GET /api/captain/me (teams, returning-season options)
→ GET /api/captain/matches (team-scoped)
→ POST /api/captain/matches/:id/scoresheet
```

**Registration flow (L10–L12):**
```
Registrant opens /register → Auth0 → team or player form
→ POST /api/register/team|player/:leagueId
→ pending_payment → Stripe Checkout → webhook → pending_approval or approved
→ Admin queue /admin/leagues/registrations → approve → Team created or player added to division
→ Email template returned to admin (or sent via Resend if configured)
```

### Cloudinary

Two logical folders:
- `barryos/pending/` — private, not publicly accessible. Uploaded on submission.
- `barryos/gallery/` — public CDN delivery. Moved here on approval.

Transforms applied at delivery (not stored): `f_auto,q_auto,w_800` for gallery tiles.

Hero video: stored directly in `barryos/hero/`. URL saved to `SiteSettings.hero.videoUrl`.

### MongoDB Atlas

Connection via Mongoose. Single connection on server boot, reconnect on drop.

```typescript
// config/db.ts
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => { console.error(err); process.exit(1); });
```

SiteSettings is a singleton — enforced with `findOneAndUpdate({ }, defaults, { upsert: true })` on boot.

---

## Deployment Architecture

### Environments

| Environment | Client URL | API URL | Branch |
|---|---|---|---|
| Development | localhost:5173 | localhost:3001 | feature/* |
| Production | barryostavern.com | api.barryostavern.com | main |

### Vercel (Client)

- Build command: `cd client && npm run build`
- Output: `client/dist`
- Environment vars: `VITE_API_URL`, `VITE_AUTH0_*`
- SPA routing: `vercel.json` rewrites all non-asset paths to `index.html`

```json
// vercel.json
{
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```

### Railway (Server)

- Start command: `cd server && npm start`
- Build command: `cd server && npm run build`
- Environment vars: all server env vars in Railway dashboard
- Health check: `GET /api/health` → 200

### Auth0 Production Configuration

Callback URLs: `https://barryostavern.com, https://barryostavern.com/admin`  
Logout URLs: `https://barryostavern.com`  
Web Origins: `https://barryostavern.com`

---

## Security Model

| Layer | Control |
|---|---|
| All admin routes | Auth0 JWT via checkJwt middleware |
| Photo submission | Rate limit (10/15min per IP), MIME validation, size limit |
| Consent | Enforced server-side — submission rejected if consent !== true |
| Image storage | Pending images in non-public Cloudinary folder |
| EXIF | Stripped by sharp before upload — GPS data never stored |
| Secrets | Environment variables only — never in source code |
| HTTPS | Enforced by Vercel + Railway in production |
| CORS | Whitelist production domain + localhost:5173 in development |

---

## Data Flow: "Staff Adds an Event"

```
Admin → EventsPage → <EventForm onSubmit />
  → services/events.ts: POST /api/admin/events  (with Auth0 token)
  → Express checkJwt → validate body → Event.create()
  → 201 { data: event }
  → useEvents() refetch → EventList re-renders with new card
  → Public site: GET /api/events (date >= now) now includes new event
  → EventsGrid flips from EvergreenPanel to event cards automatically
```

## Data Flow: "Patron Submits a Photo"

```
Patron → /submit → <SubmitPhotoForm />
  → consent checkbox required (UI + server)
  → POST /api/submissions (multipart)
  → rateLimit → multer → imagePipeline
  → sharp: EXIF strip + thumbnail
  → cloudinary upload → barryos/pending/
  → Submission.create({ status: 'pending' })
  → 201 → ThankYou page shown
  [ nothing appears on the public site ]

Staff → /admin/submissions → ModerationQueue (Pending tab)
  → sees photo, caption, "Rights confirmed" indicator
  → clicks Approve
  → PATCH /api/admin/submissions/:id { status: 'approved' }
  → cloudinary.rename pending → gallery
  → Submission updated
  → GET /api/gallery now includes this photo
  [ photo appears in public gallery ]
```

## Data Flow: "Captain Submits Matching Scoresheets"

```
Captain A → /captain → submit scoresheet for home match
  → POST /api/captain/matches/:id/scoresheet
  → Scoresheet status: submitted (one side)

Captain B → submit matching scoresheet
  → evaluateScoresheets() via getScoresheetValidator(sport)
  → payloads match → both approved → Match status: final
  → StandingsEngine recomputes → StandingsSnapshot updated
  → GET /api/leagues/:id/standings reflects new ranks

If payloads differ → both disputed → admin resolves on LeagueDetailPage
  → POST /api/admin/leagues/:id/matches/:id/resolve → final → standings recalc
```

## Data Flow: "Staff Creates a League"

```
Admin → /admin/leagues → create pool league
  → assertSportLicensed('pool') from establishment.json
  → POST /api/admin/leagues
  → divisions → teams → captains → POST .../schedule/generate
  → captains use /captain; public sees /leagues/:id when league status active
```
