# Multi-Sport League Management — Product & Technical Plan

**Module:** Leagues (optional, tiered per sport)  
**Sports:** Pool · Darts · Volleyball  
**Stack:** Same MERN platform — Vite/React client, Express/TypeScript API, MongoDB, Auth0, deployed on Vercel/Railway  
**Status:** **Shipped** (pool, darts, volleyball) — optional per-sport module via `config/establishment.json`  
**Build history:** [prompts/LEAGUES_BUILD_PROMPTS.md](prompts/LEAGUES_BUILD_PROMPTS.md) (L0–L8.8 complete; L7.3 integration tests remain)  
**Last updated:** June 2026

---

## Implementation status (June 2026)

The league module is **in the repo and production-ready** for all three sports. Code lives under `server/src/models/leagues/`, `server/src/routes/leagues/`, `server/src/services/leagues/`, and matching client pages.

| Area | Status |
|------|--------|
| Pool, darts, volleyball leagues | End-to-end — admin CRUD, schedules, scoresheets, standings, public pages |
| Schedule formats | Round-robin, ladder, bracket (`server/src/services/leagues/schedule/`) |
| Captain portal | `/captain` — dual-entry scoresheets, dispute flow, invite onboarding |
| Player portal | `/player` — standings; `/player/scores` — dual-entry for player-entrant matches |
| Tournaments (L8) | `kind: 'tournament'` + `entrantType: 'player'` — bracket UI, placement standings |
| CSV import | Teams, players, schedule, historical results; CompuSport alias mapping |
| Pool polish | 8-ball team race (season league); 9-ball singles race-to (tournament) |
| Licensing | `modules.leagues` in `establishment.json` enforced server-side (L7.1) |
| Remaining | L7.3 automated standings/scoresheet tests; online registration (deferred) |

For AI session context see [contexts/CONTEXT_leagues.md](contexts/CONTEXT_leagues.md). For schemas see [leagues/SCHEMAS.md](leagues/SCHEMAS.md).

---

## Season league vs tournament (L8)

Tavern Base distinguishes **ongoing season leagues** from **one-off knockout tournaments** on the same `League` model. Staff pick both at create time; the public site labels tournaments on `/leagues`.

| Field | Season league (default) | Knockout tournament |
|-------|-------------------------|---------------------|
| `kind` | `league` | `tournament` |
| `entrantType` | `team` (rosters + captains) | `player` (individual entrants on `Division.playerIds`) |
| `format` | `round_robin` or `ladder` | `bracket` (required) |
| Score entry | Captain portal (`/captain`) | Player portal (`/player/scores`) or staff finalize |
| Standings | W-L season engines (`standingsType: 'season'`) | Bracket placement 1..N (`TournamentPlacementEngine`) |
| Public UX | Standings + schedule tabs | Bracket columns + Placements tab; empty bracket → friendly panel |

### Sport defaults (resolved)

| Sport | Season league example | Tournament example |
|-------|----------------------|-------------------|
| **Pool** | 8-ball team race — no per-match `raceTo` | 9-ball singles knockout — `raceTo: 5` |
| **Darts** | Team legs format | 501 singles knockout — `legsToWin: 2` |
| **Volleyball** | Best-of-3 team season | *(tournament presets deferred)* |

**Deferred post-L8:** online registration, entry fees, check-in desk, doubles pair entrant (`entrantType: 'pair'`).

---

Tavern Base adds an optional **Leagues** module so bars can run pool, darts, and volleyball leagues from the same dashboard and public site they already use for events, photos, and announcements. Each sport is a separate, purchasable module — single-sport venues are not cluttered or overcharged — but all sports share one underlying data model and workflow engine.

**Primary competitors in the field:** CompuSport (pool), MusicService (pool/darts partner), and paper/spreadsheet leagues (especially volleyball). None offer a clean unified multi-sport experience tied to the venue's own website.

**Integration strategy:** Build native league management. Treat CompuSport and MusicService as **migration targets**, not API partners. "Integration" means **CSV import tooling** to bring existing league data in — not live sync.

---

## Strategic framing

### Tiered module model

| Layer | Purpose |
|-------|---------|
| `config/establishment.json` → `modules.leagues.{pool,darts,volleyball}` | What the venue **paid for** (sales/licensing tier). Set at deployment; not editable in dashboard. |
| `SiteSettings.sportsEnabled` | What staff **turn on** at runtime (like `announcement.enabled`). Lets a pool bar hide darts UI mid-season without re-deploying. |

Single-sport bars buy only what they need. Multi-sport venues get a unified admin and public experience in Phase 4.

### Third-party reality check

| System | API / docs | Approach |
|--------|------------|----------|
| **CompuSport** | Closed system. No public API or developer docs found. | **Replacement target.** Pitch: "Leave CompuSport — we do this better and it's local." Long-term low-priority option: read-only scrape of public standings on `manager.compusport.ca` for historical stats — fragile; build last if at all. |
| **MusicService** | No surfaced API. Lists CompuSport as a league partner; pool leagues likely run on CompuSport infrastructure. Dart leagues may be proprietary or CompuSport-based. | **Replacement target.** Worth one direct call to MusicService/CompuSport to ask about data export or partnership before ruling it out — do not block Phase 1 on the answer. |

**Net effect:** Invest in a strong native base for all three sports. Frame the pitch around cost savings, local support, and unified multi-sport management — not live API sync.

---

## Pitch positioning

### By venue type

| Venue profile | Pain point | Pitch |
|---------------|------------|-------|
| **Paper-based leagues** (volleyball everywhere; some pool) | Spreadsheets, text chains, lost scoresheets | "Go fully digital" — biggest pain-point win, easiest sell. |
| **CompuSport / MusicService shops** | Per-player fees ($1–2/player for scoresheet and fee-management features), vendor lock-in, pool-only focus | Cost savings + local support + unified site (events, gallery, leagues in one place). |
| **Multi-sport venues** | Juggling CompuSport + paper + separate dart tooling | **Strongest differentiator:** single-pane management across volleyball + pool + darts. No competitor mentioned offers this cleanly for one establishment. |

### One-liner for mixed venues

> Your events calendar, photo gallery, and league standings — one site, one dashboard, one local contact. CompuSport is pool-only and charges per player for features you already need.

### Lead with the loudest pain per bar

- Volleyball → greenfield digital (no incumbent to displace)
- Pool → highest commercial pressure (venues already paying CompuSport)
- Darts → Phase 2 upsell once pool proves the workflow

---

## Phased rollout

### Phase 1 — Foundation + Pool (highest commercial pressure)

**Goal:** End-to-end pool league a bar can run without CompuSport.

| Deliverable | Notes |
|-------------|-------|
| Shared data model | League, Division, Team, Player, Match, Scoresheet, StandingsSnapshot |
| Pool formats | 8-ball / 9-ball; team race formats; individual + team standings |
| Handicap systems | APA/VNEA-style — **v1.1** after basic W-L standings ship |
| Captain scoresheet workflow | Dual-entry submit + confirm; mirrors familiar CompuSport UX |
| CSV import | Migrate CompuSport league / team / player data |
| Admin dashboard | League setup wizard, schedule generator, auto-calculated standings |
| Public pages | `/leagues` — standings and schedules (EvergreenPanel when empty) |

### Phase 2 — Darts

Reuse Match / Scoresheet / Standings engine.

| Deliverable | Notes |
|-------------|-------|
| Dart formats | 501/301, cricket, doubles/singles legs, NDA/VNEA-style team formats |
| CSV import | Extended column mapping for dart league exports |

### Phase 3 — Volleyball

Greenfield — biggest opportunity to differentiate with a clean digital-first experience.

| Deliverable | Notes |
|-------------|-------|
| Set/match scoring | Best of 3/5 |
| Rotation tracking | Optional — keep simple for rec leagues; most bar leagues won't want full stat tracking |
| Shared engine | Same schedule and standings infrastructure as pool/darts |

### Phase 4 — Cross-sport venue features

| Deliverable | Notes |
|-------------|-------|
| Unified "My Leagues" | Players in multiple sports at the same venue |
| Venue dashboard | All active leagues across sports in one view |
| Public league hub | `/leagues` integrated into public site (pattern mirrors `/calendar`) |
| Player self-service | Register for leagues; view personal stats across sports |

---

## Shared data model (build first)

Sport-agnostic foundation. All three sports plug into these entities. Use a **`sport` discriminator** field (`'pool' | 'darts' | 'volleyball'`) on League and Match; Mongoose discriminators for sport-specific sub-schemas.

### Entity overview

```
Establishment (venue)
  └── sportsEnabled: { pool, darts, volleyball }   ← SiteSettings + establishment.json
  └── Leagues[]
        └── Divisions[]          (skill levels / flights)
              └── Teams[]
                    └── Players[] (roster)
        └── Matches[]            (schedule + results)
              └── Scoresheets[]  (captain submission + approval)
        └── StandingsSnapshots[] (materialized on match finalization)
```

### Establishment / venue config

Extends existing venue identity — not a new deployment model.

- **`config/establishment.json`** — module licensing flags (what was sold).
- **`SiteSettings.sportsEnabled`** — runtime toggles staff control from dashboard.

Today's platform is **one venue per deployment**. `Team.homeEstablishment` is reserved for future multi-venue leagues (Phase 4+); Phase 1 treats the current deployment as implicit home venue.

### League

```typescript
{
  sport: 'pool' | 'darts' | 'volleyball';
  name: string;
  seasonStart: Date;
  seasonEnd: Date;
  format: 'round_robin' | 'ladder' | 'bracket';
  status: 'draft' | 'active' | 'completed';
}
```

### Division

Skill tier or flight within a league. Pool handicap rules attach here.

```typescript
{
  leagueId: ObjectId;
  name: string;           // e.g. "A Flight", "Division 1"
  order: number;
  handicapRules?: object; // sport-specific; pool APA/VNEA config lives here
}
```

### Team

```typescript
{
  leagueId: ObjectId;
  divisionId: ObjectId;
  name: string;
  captainPlayerId: ObjectId;
  playerIds: ObjectId[];
  // homeEstablishment?: string  — Phase 4 multi-venue
}
```

### Player

Venue-scoped identity. A player can be in pool **and** darts leagues at the same bar.

```typescript
{
  name: string;
  email?: string;         // dedup key across sports at same venue
  phone?: string;
  auth0Sub?: string;      // set when captain account is created (Phase 1)
  establishmentSlug: string;
}
```

### Match / Fixture

```typescript
{
  leagueId: ObjectId;
  divisionId: ObjectId;
  homeTeamId: ObjectId;
  awayTeamId: ObjectId;
  scheduledAt: Date;
  venue?: string;         // defaults to establishment name
  status: 'scheduled' | 'in_progress' | 'final' | 'forfeit' | 'cancelled';
  result?: {
    winnerTeamId?: ObjectId;
    homeScore: number;
    awayScore: number;
    forfeitBy?: 'home' | 'away';
  };
  // sport-specific fields via Mongoose discriminator (e.g. pool race format, dart legs)
}
```

### Scoresheet

Captain submission + approval workflow. Mirrors the existing **Submission moderation** pattern (patron submits → staff approves).

```typescript
{
  matchId: ObjectId;
  submittedBy: 'home' | 'away';
  submittedByPlayerId: ObjectId;
  status: 'draft' | 'submitted' | 'disputed' | 'approved';
  payload: Mixed;         // sport discriminator defines shape
  reviewedBy?: ObjectId;  // league admin User
  reviewedAt?: Date;
}
```

#### Scoresheet state machine

```
scheduled
  → home captain submits
  → away captain confirms (or disputes)
  → if match: approved → final → standings recalculated
  → if conflict: disputed → league admin resolves → approved → final
```

### Standings

**Computed**, not hand-edited. Use a **pluggable strategy pattern**:

- `StandingsEngine` (interface)
- `PoolStandingsEngine`
- `DartsStandingsEngine`
- `VolleyballStandingsEngine`

**Materialize on match finalization:** write a `StandingsSnapshot` document per division when a match moves to `final`. Public pages read snapshots; admin can trigger a full recalc. Avoid recomputing full tables on every GET.

---

## Technical execution

### Patterns to mirror from existing codebase

| League concept | Existing Tavern Base pattern |
|----------------|------------------------------|
| Captain scoresheet → admin approval | `Submission` pending → approve/reject in `/admin/submissions` |
| Public empty state | `EvergreenPanel` when events calendar is empty |
| Sport-specific display rules | `server/src/utils/eventSchedule.ts` + client mirror |
| Admin CRUD | `server/src/routes/admin.ts` + pages under `/admin/*` |
| Module runtime toggle | `SiteSettings.announcement.enabled`, `christmasParty.enabled` |
| Venue identity / licensing | `config/establishment.json` |

### Proposed server layout (Phase 1)

```
server/src/
├── models/leagues/
│   ├── League.ts
│   ├── Division.ts
│   ├── Team.ts
│   ├── Player.ts
│   ├── Match.ts
│   ├── matches/              # Mongoose discriminators
│   │   ├── PoolMatch.ts
│   │   ├── DartsMatch.ts
│   │   └── VolleyballMatch.ts
│   ├── Scoresheet.ts
│   └── StandingsSnapshot.ts
├── services/leagues/
│   ├── standings/
│   │   ├── StandingsEngine.ts
│   │   ├── PoolStandingsEngine.ts
│   │   ├── DartsStandingsEngine.ts
│   │   └── VolleyballStandingsEngine.ts
│   ├── schedule/
│   │   └── roundRobin.ts
│   └── import/
│       └── compusportCsv.ts
├── routes/leagues/
│   ├── index.ts
│   ├── public.ts             # GET standings, schedule (no auth)
│   ├── admin.ts              # checkJwt + league_admin / manager
│   ├── captain.ts            # checkJwt + captain scope
│   └── pool.ts               # sport-specific score entry
```

Mount in `server/src/index.ts` (implemented):

```
/api/leagues              → public read (list, detail, standings, matches)
/api/admin/leagues        → staff / league_admin CRUD, import, disputes
/api/captain              → captain profile, matches, scoresheet submit
/api/player               → player activation, read-only league standings
```

Sport-specific validation uses `getScoresheetValidator(sport)` inside shared routes — not separate `/api/leagues/pool` namespaces.

### Client routes (implemented)

```
Public
  /leagues                      → hub (sport tabs when multiple enabled)
  /leagues/:leagueId            → standings + schedule for one league

Admin (Auth0 — manager / league_admin / staff read)
  /admin/leagues                → overview, sports toggles, create league
  /admin/leagues/:id            → divisions, teams, schedule, import, disputes

Captain (Auth0 — captain role, team-scoped)
  /captain/login                → Auth0 login
  /captain                      → scoresheet inbox for upcoming matches

Player (Auth0 — player role, read-only)
  /player/login                 → Auth0 login
  /player                       → leagues the player belongs to + standings
```

Admin sidebar shows **Leagues** only when `sportsEnabled` has at least one sport on. Same conditional pattern as Christmas admin.

Public league pages follow the `/calendar` pattern: fetch active leagues, render standings/schedule grids, show **EvergreenPanel-style empty state** when no active leagues — never an error state.

### Auth and roles

Current `User` model: `manager | staff` (bar employees, Auth0 JWT).

**Extend for leagues (implemented):**

| Role | Access |
|------|--------|
| `manager` | Full admin including league setup, dispute resolution, CSV import, site settings |
| `staff` | Dashboard + league read; write routes require `league_admin` or `manager` |
| `league_admin` | League CRUD, schedule, standings, disputes, CSV import — no site settings |
| `captain` | Scoresheet submit/confirm for assigned team via `User.playerId` → `Team.captainPlayerId` |
| `player` | Read-only `/player` portal for leagues where `playerId` is on a team roster |

**Captain onboarding:** Staff assigns captain on roster → **Invite captain** (or manual `auth0Sub` link) → captain logs in at `/captain/login`. See [SETUP_AUTH0.md](SETUP_AUTH0.md).

Players without scoresheet duties use the `/player` portal (read-only) when linked by staff.

### CSV import / export

Build early in Phase 1 — it is both the **migration tool** and the **integration story** for sales.

| Direction | Use |
|-----------|-----|
| **Import** | CompuSport / MusicService / spreadsheet exports → League, Team, Player, historical Match |
| **Export** | Venue data backup; future portability |

Requires a **real CompuSport CSV sample** from a pilot bar to finalize column mapping. Until then, define a documented canonical import format venues can map to.

### Non-negotiables (league module)

1. Standings are **computed** from approved match results — never hand-edited in production without an audit trail.
2. A match is not `final` until both captains confirm (or league admin resolves a dispute).
3. All `/api/admin/leagues/*` and `/api/captain/leagues/*` routes require Auth0 JWT.
4. Captain routes are **team-scoped** — a captain cannot submit scores for another team's match.
5. Public league pages show only **active** leagues and **approved/final** results — same read-mostly posture as public events.
6. Empty league state → friendly empty panel, not an error (mirrors EvergreenPanel).

---

## Phase 1 implementation order — COMPLETE

All Phase 1 steps shipped. See [prompts/LEAGUES_BUILD_PROMPTS.md](prompts/LEAGUES_BUILD_PROMPTS.md) for the full L0–L7 build history.

**Also shipped (L2–L7):** Darts and volleyball modules, cross-sport dashboard, captain/player portals, homepage preview, ladder/bracket schedules, CompuSport CSV aliases, historical results import, establishment licensing enforcement.

**Deferred:** APA/VNEA handicap math in standings (storage only today); L7.3 integration tests.

---

## Open decisions (resolve before Phase 1 code)

| # | Question | Impact |
|---|----------|--------|
| 1 | **Pilot bar** — which pool format first? (8-ball team race vs 9-ball singles) | Scoresheet `payload` shape |
| 2 | **Captain onboarding** — Auth0 invite flow acceptable for pilot captains? | Auth UX |
| 3 | **CompuSport CSV sample** — can we get a real export from a pilot bar? | Import column mapping |
| 4 | **Pricing tier** — per-sport flags in `establishment.json`? | Sales / deployment config |
| 5 | **Multi-venue leagues** — defer `homeEstablishment` to Phase 4? | Team model scope |

---

## Relationship to platform roadmap

Leagues is a **shipped optional module** documented in [PLATFORM.md](./PLATFORM.md). Per-venue sport licensing is enforced via `config/establishment.json` (`server/src/config/establishment.ts`).

Ongoing maintenance:

- [leagues/SCHEMAS.md](./leagues/SCHEMAS.md) — canonical TypeScript schema reference
- [contexts/CONTEXT_leagues.md](./contexts/CONTEXT_leagues.md) — AI session context
- [prompts/LEAGUES_BUILD_PROMPTS.md](./prompts/LEAGUES_BUILD_PROMPTS.md) — build history; L7.3 tests remain

---

## Related docs

| Document | Purpose |
|----------|---------|
| [LEAGUES.md](./LEAGUES.md) | Product plan and phased rollout |
| [prompts/LEAGUES_BUILD_PROMPTS.md](./prompts/LEAGUES_BUILD_PROMPTS.md) | Build history (L0–L7.1 shipped; L7.3 tests remain) |
| [leagues/SCHEMAS.md](./leagues/SCHEMAS.md) | TypeScript schema reference |
| [architecture/ARCHITECTURE.md](./architecture/ARCHITECTURE.md) | Current system design |
| [SETUP_AUTH0.md](./SETUP_AUTH0.md) | Auth0 setup — extend for captain/league_admin roles |
| [contexts/CONTEXT_admin_dashboard.md](./contexts/CONTEXT_admin_dashboard.md) | Dashboard patterns for new admin pages |
| [contexts/CONTEXT_server_models.md](./contexts/CONTEXT_server_models.md) | Mongoose conventions |
| [AGENTS.md](../AGENTS.md) | AI assistant orientation |
