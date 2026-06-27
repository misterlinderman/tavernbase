# Agent context — Tavern Base

Use this file for fast orientation when editing this repository in an AI-assisted IDE.

## What this is

**Tavern Base** — a white-label MERN platform for neighborhood bars and taverns, forked from the Barry O's production site. The first live deployment is Barry O's; this repo is the base for pitching and onboarding additional establishments.

Each venue gets:

- **Public site** — marketing pages (read-mostly): home, event calendar, photo submit, featured banner, leagues
- **Staff dashboard** — Auth0-gated SPA for all content management
- **Captain portal** — Auth0-gated scoresheet workflow for team captains
- **Player portal** — Auth0-gated read-only standings for rostered players

**Owner is non-technical.** Dashboard copy must be plain English. An empty event calendar is normal — show EvergreenPanel, never an error. An empty leagues list is normal — show LeaguesEmptyPanel, never an error.

## Stack

- **client**: Vite + React 18 + TypeScript + Tailwind + Auth0 SPA SDK
- **server**: Express + TypeScript + Mongoose + MongoDB; JWT validation on `/api/admin/*`, `/api/captain/*`, `/api/player/*`
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
| `npm run test` | Run server unit tests (Vitest, no MongoDB) |
| `npm run test:server` | Same as `npm run test` |
| `npm run lint` | ESLint in client and server |
| `npm run format` | Prettier for common file types |

## Public routes

```
/                    → HomePage
/calendar            → CalendarPage (full event list)
/leagues             → LeaguesPage (hub when sports enabled)
/leagues/:leagueId   → LeaguePublicPage (standings + schedule)
/register            → RegisterPage (open league registrations)
/register/:leagueId  → RegisterLeaguePage (team or player flow)
/register/payment/success → RegisterPaymentSuccessPage (Stripe return)
/register/payment/cancel  → RegisterPaymentCancelPage (retry checkout)
/submit              → SubmitPage
/thank-you           → ThankYouPage
/captain/login       → CaptainLoginPage
/captain             → CaptainPage (scoresheets)
/captain/teams       → CaptainTeamsPage (my teams hub)
/captain/teams/:teamId/roster → CaptainRosterPage (roster edits when allowed)
/captain/register/:targetLeagueId/:priorTeamId → CaptainReturningRegisterPage (re-register)
/player/login        → PlayerLoginPage
/player              → PlayerPage (standings)
/player/scores       → PlayerScoresPage (dual-entry for player-entrant matches)
/admin/login         → LoginPage
/admin               → Overview (protected)
/admin/submissions   → SubmissionsPage
/admin/events        → EventsPage
/admin/leagues       → LeaguesPage (overview + create)
/admin/leagues/registrations → RegistrationQueuePage (cross-league approval queue)
/admin/leagues/people → LeaguePeoplePage (players & captains directory)
/admin/leagues/:id   → LeagueDetailPage (registration settings, payments, per-league queue)
/admin/announcement  → AnnouncementPage
/admin/featured-banner → FeaturedBannerPage
/admin/hours         → HoursPage
/admin/media         → MediaPage
```

## API routes (summary)

### Public — no auth

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/site` | Site settings (public fields) |
| GET | `/api/events` | Active upcoming events |
| GET | `/api/gallery` | Approved photo submissions |
| POST | `/api/submissions` | Photo submit (multipart, rate-limited) |
| GET | `/api/leagues` | Active/completed leagues (licensed + enabled sports) |
| GET | `/api/leagues/:id` | League detail |
| GET | `/api/leagues/:id/standings` | Standings by division |
| GET | `/api/leagues/:id/matches` | Schedule + final results |
| GET | `/api/leagues/registration-open` | Leagues with open self-service registration |
| GET | `/api/leagues/:id/registration` | Public registration info (fee, window, spots) |

### Register — Auth0 JWT (`checkJwt` + email verification for paid leagues)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/register/team/:leagueId` | Team registration submit → checkout or approval |
| POST | `/api/register/player/:leagueId` | Player registration submit |
| POST | `/api/register/team/:leagueId/returning` | Returning captain re-register from prior season |
| GET | `/api/register/team/:leagueId/returning/preview` | Pre-fill prior roster for re-registration |
| GET | `/api/register/registrations/:id` | Registration status (owner) |
| POST | `/api/register/registrations/:id/checkout` | Retry Stripe checkout |

### Admin — Auth0 JWT (`checkJwt`)

| Method | Path | Purpose |
|--------|------|---------|
| GET/PUT | `/api/admin/site` | Site settings incl. `sportsEnabled` |
| GET/POST/PATCH/DELETE | `/api/admin/events` | Event CRUD |
| GET/PATCH/DELETE | `/api/admin/submissions/:id` | Photo moderation |
| GET/POST/PATCH/DELETE | `/api/admin/leagues` | League CRUD |
| GET | `/api/admin/leagues/people` | Paginated players/captains directory (L9.1) |
| GET | `/api/admin/leagues/registrations` | Cross-league registration queue (L12.4) |
| POST | `/api/admin/leagues/registrations/:id/approve` | Approve registration → create team or add player |
| POST | `/api/admin/leagues/registrations/:id/reject` | Reject registration |
| POST | `/api/admin/leagues/registrations/:id/promote` | Promote waitlist (respects `maxEntrants`) |
| GET | `/api/admin/leagues/:id/registrations` | Per-league registration list |
| GET | `/api/admin/leagues/:id/payments` | Payment ledger (L11.4) |
| POST | `/api/admin/leagues/:id/registrations/:id/waive-fee` | Waive entry fee (manager) |
| POST | `/api/admin/leagues/:id/registrations/:id/refund` | Stripe refund (manager) |
| POST | `/api/admin/leagues/people/:playerId/link-login` | Invite or manually link captain/player login (L9.2) |
| DELETE | `/api/admin/leagues/people/:playerId/link-login` | Unlink captain/player login (L9.2) |
| POST | `/api/admin/leagues/:id/schedule/generate` | Round-robin / ladder / bracket |
| POST | `/api/admin/leagues/:id/import` | CSV import (teams, players, schedule, results) |
| POST | `/api/admin/leagues/:id/matches/:matchId/resolve` | Dispute resolution |
| POST | `/api/admin/leagues/:id/matches/:matchId/finalize` | Staff-enter result (player matches) |
| POST | `/api/admin/leagues/:id/standings/recalculate` | Recompute standings |

League write routes require `manager` or `league_admin`. Staff can read.

### Captain — Auth0 JWT + `requireCaptain`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/captain/activate` | Link Auth0 user to captain Player record |
| GET | `/api/captain/me` | Captain profile, teams, returning-season options (L12.1) |
| GET | `/api/captain/matches` | Upcoming matches for captain's team |
| GET/POST/DELETE | `/api/captain/teams/:teamId/roster` | Captain roster management (L12.2) |
| POST | `/api/captain/matches/:matchId/scoresheet` | Submit scoresheet (team-scoped) |

### Player — Auth0 JWT + `requirePlayer`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/player/activate` | Link Auth0 user to Player record |
| GET | `/api/player/leagues` | Leagues where player is on a roster |
| GET | `/api/player/leagues/:id/standings` | Read-only standings |
| GET | `/api/player/matches` | Upcoming player-entrant matches |
| POST | `/api/player/matches/:matchId/scoresheet` | Dual-entry scoresheet (player matches) |

## Key features to know

### Events (three schedule types)

| Type | Staff label | Fields | Public display |
|------|-------------|--------|----------------|
| `dated` | Specific date | `date` | Single date on card (e.g. `JUN 15`) |
| `multi_day` | Multiple days | `startDate`, `endDate` | Weekday span (e.g. `THU–SUN`) + date range on calendar page |
| `weekly` | Weekly | `dayOfWeek`, `startDate`, `endDate` | Day label (e.g. `MONDAYS`) + season range |

Public API `GET /api/events` returns only **active upcoming** events. Logic lives in `server/src/utils/eventSchedule.ts` (mirrored in `client/src/constants/eventSchedule.ts` for display).

Homepage: `EventsSection` → `EventsGrid` (with link to `/calendar`) or `EvergreenPanel` when empty.

### Leagues (optional module — pool · darts · volleyball)

- **Licensing:** `config/establishment.json` → `modules.leagues.{pool,darts,volleyball}` — enforced server-side
- **Runtime toggles:** `SiteSettings.sportsEnabled` — staff enable/disable licensed sports
- **Kind / entrant:** `League.kind` (`league` | `tournament`) and `entrantType` (`team` | `player`) — tournaments use `format: 'bracket'` and `Division.playerIds` for seeds
- **Schedule formats:** `round_robin`, `ladder`, `bracket` on `League.format`
- **Scoresheets:** Team leagues — dual captain entry via `/captain`. Player tournaments — dual player entry via `/player/scores`; staff can finalize without logins
- **Standings:** Season leagues — sport engines (`PoolStandingsEngine`, etc.). Tournaments — `TournamentPlacementEngine` (1st, 2nd, …) — never hand-edited
- **Public:** `/leagues` lists tournaments with a **Tournament** badge; detail shows bracket columns or `BracketEmptyPanel` when no draw yet
- **Pool split:** 8-ball team race = season league; 9-ball singles race-to = tournament preset
- **CSV import:** Teams → players → schedule → historical results; CompuSport column aliases supported
- **Self-service registration (L10–L12):** Public `/register` when `League.registration.enabled` + date window; team or player flows; optional Stripe entry fee; admin approval queue; waitlist with `maxEntrants`
- **Payments (L11):** Stripe Checkout on submit; webhook completes registration; admin payment ledger, waive fee, refund on league detail
- **Captain lifecycle (L12):** `/captain/teams` hub; roster edits when registration open or `captainRosterEdits`; returning-team re-registration via `registration.priorLeagueId`; registration email templates (Resend optional — see SETUP.md §10)

Deep context: [docs/contexts/CONTEXT_leagues.md](docs/contexts/CONTEXT_leagues.md) · [docs/LEAGUES.md](docs/LEAGUES.md)

### Photo submissions

- `POST /api/submissions` — multipart, rate-limited, consent required server-side
- EXIF stripped via `sharp` before Cloudinary upload to venue pending folder
- Approval moves asset to venue gallery folder; only `status: 'approved'` appears in public gallery
- **Never auto-publish**

### Site settings (singleton)

Announcement bar, featured banner, hero video, hours, contact, Instagram, sports enabled — all toggled via `SiteSettings` in MongoDB. Disabled components render `null` on the public site.

## Where to look

| Task | Location |
|------|----------|
| API routes | `server/src/routes/` |
| League routes | `server/src/routes/leagues/` · `register.ts` (public signup) |
| Registration / payments | `server/src/services/leagues/registration*.ts` · `server/src/services/payments/` |
| Registration email | `server/src/services/notifications/registrationEmail.ts` |
| Event schedule logic | `server/src/utils/eventSchedule.ts` |
| League standings | `server/src/services/leagues/standings/` |
| Scoresheet workflow | `server/src/services/leagues/scoresheet.ts` |
| Establishment licensing | `server/src/config/establishment.ts` |
| Auth middleware | `server/src/middleware/auth.ts` |
| Image pipeline | `server/src/middleware/imagePipeline.ts` |
| Models | `server/src/models/` · league models in `server/src/models/leagues/` |
| App routes | `client/src/App.tsx` |
| Public components | `client/src/components/public/` |
| Admin pages | `client/src/pages/admin/` |
| Captain / player pages | `client/src/pages/captain/` · `client/src/pages/player/` |
| API client | `client/src/services/` |
| Design tokens | `client/src/styles/tokens.css` |
| Architecture | `docs/architecture/ARCHITECTURE.md` |
| Full conventions | `.cursorrules`, `.cursor/rules/` |

## Env setup

Copy examples: `.env.example`, `client/.env.example`, `server/.env.example` → respective `.env` files. Copy `config/establishment.example.json` → `config/establishment.json` for venue identity and league module licensing. Configure MongoDB Atlas, Auth0, and Cloudinary before exercising authenticated or upload flows. For league registration: Stripe (`STRIPE_*` in `server/.env`) and optional Resend email — see [SETUP.md](SETUP.md) §9–10 and [docs/SETUP_AUTH0.md](docs/SETUP_AUTH0.md). See also [docs/PLATFORM.md](docs/PLATFORM.md).

## Critical non-negotiables

### Site-wide

1. No stranger-submitted photo on the public site without staff approval
2. Consent enforced server-side on submissions — never trust the UI alone
3. EXIF stripped from every uploaded image
4. All `/api/admin/*` routes require Auth0 JWT
5. Empty events calendar → EvergreenPanel, not an error state
6. Secrets in `.env` only — never in source

### Leagues module

7. Standings are **computed** from finalized match results — never hand-edited without audit trail
8. A match is not `final` until both captains confirm matching scoresheets (or admin resolves dispute)
9. Captain routes are **team-scoped** — captains cannot submit for another team's match
10. Public leagues show only **active/completed** leagues and **final** results
11. Empty leagues state → friendly empty panel, not an error
12. Unlicensed sports cannot be enabled or used (`establishment.json` + `sportsEnabled`)
