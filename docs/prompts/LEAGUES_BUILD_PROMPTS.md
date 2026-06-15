# Multi-Sport Leagues — Phased Build Prompt Sequences

**Module:** Leagues (pool · darts · volleyball) + tournaments  
**Status:** Phases **L0–L7 shipped** — prompts below include reference (L0–L7) and **Phase L8** (tournaments / individual entrants)  
**Last updated:** June 2026

Paste the relevant prompt into Cursor chat with **`docs/contexts/CONTEXT_leagues.md`** attached (and `.cursorrules` / `AGENTS.md` as usual).

Each prompt is self-contained: what to build, which files to touch, acceptance criteria.

**Product plan:** [LEAGUES.md](../LEAGUES.md) · **Schemas:** [leagues/SCHEMAS.md](../leagues/SCHEMAS.md)

---

## Quick reference

| Phase | Prompt | What it builds |
|-------|--------|----------------|
| **L0** | — | Pool foundation *(complete — reference only)* |
| **L1** | L1.1 | Sport-aware scoresheet + finalization router |
| **L2** | L2.1 | Pool format UI (8-ball / 9-ball) |
| **L2** | L2.2 | APA/VNEA handicap scaffolding *(optional)* |
| **L3** | L3.1 | Darts models + `DartsStandingsEngine` |
| **L3** | L3.2 | Darts scoresheet + captain/admin UI |
| **L4** | L4.1 | Volleyball models + `VolleyballStandingsEngine` |
| **L4** | L4.2 | Volleyball scoresheet + captain/admin UI |
| **L5** | L5.1 | `league_admin` role + route gating |
| **L5** | L5.2 | Captain Auth0 invite / onboarding |
| **L5** | L5.3 | Venue leagues dashboard (all sports) |
| **L5** | L5.4 | Player self-service portal |
| **L5** | L5.5 | Homepage leagues preview section |
| **L6** | L6.1 | Ladder + bracket schedule generators |
| **L6** | L6.2 | CompuSport CSV column mapping *(when sample available)* |
| **L6** | L6.3 | CSV historical results import |
| **L7** | L7.1 | Establishment module enforcement |
| **L7** | L7.2 | Docs + AGENTS.md update |
| **L7** | L7.3 | Standings / scoresheet integration tests |
| **L8** | L8.1 | `kind` + `entrantType` on League |
| **L8** | L8.2 | Player-entrant roster (no teams) |
| **L8** | L8.3 | Player-vs-player matches + bracket seeding |
| **L8** | L8.4 | Individual entrant scoresheet workflow |
| **L8** | L8.5 | **Darts 501 singles** tournament (first pilot) |
| **L8** | L8.6 | Tournament placement standings |
| **L8** | L8.7 | **Pool 9-ball singles** tournament |
| **L8** | L8.8 | Public tournament page + docs |

**Recommended order:** L0–L7 complete. Next: **L8.1 → L8.5** (darts singles pilot), then L8.7 (pool singles).

**Branch convention:** `feat/leagues-l{N}-{short-name}`

---

## PHASE L0: Pool Foundation — COMPLETE

**Goal:** End-to-end native pool league without CompuSport.

**Shipped (do not rebuild):**

- Models: `server/src/models/leagues/*`
- Admin: `/admin/leagues`, `/admin/leagues/:id` — CRUD, schedule gen, standings, disputes, CSV import
- Captain: `/captain` — dual-entry pool scoresheets
- Public: `/leagues`, `/leagues/:leagueId`
- `PoolStandingsEngine`, round-robin schedule, `POST .../import`

**Verify before starting L1:**

```bash
npm run dev
# Admin: create pool league → divisions → teams → captains → generate schedule
# Captain: submit matching scoresheets → standings update
# Public: /leagues shows league
```

---

## PHASE L1: Sport Abstraction Layer

**Goal:** Refactor pool-specific scoresheet logic so darts and volleyball plug in without copy-paste. **Required before L3/L4.**

**Estimated time:** 2–3 hours  
**Branch:** `feat/leagues-l1-scoresheet-router`

---

### Prompt L1.1 — Sport-aware scoresheet router

```
Read docs/contexts/CONTEXT_leagues.md and server/src/services/leagues/scoresheet.ts.

Pool scoresheet validation and finalization are hardcoded. Refactor into a sport-pluggable 
router so L3 (darts) and L4 (volleyball) only add new validators + engines.

1. CREATE server/src/services/leagues/scoresheets/ directory:
   - types.ts — ScoresheetPayloadValidator interface:
       sport: Sport
       validate(payload: unknown): Record<string, unknown>
       payloadsMatch(a: Record<string, unknown>, b: Record<string, unknown>): boolean
       toMatchResult(match: IMatch, payload: Record<string, unknown>): IMatchResult
   - pool.ts — move PoolScoresheetPayload, validatePoolScoresheetPayload, 
     pool payloadsMatch, pool toMatchResult from scoresheet.ts
   - index.ts — getScoresheetValidator(sport: Sport): ScoresheetPayloadValidator
       pool → pool validator
       darts/volleyball → throw clear "not implemented" until L3/L4

2. UPDATE server/src/services/leagues/scoresheet.ts:
   - Import getScoresheetValidator instead of inline pool logic
   - evaluateScoresheets: use validator.payloadsMatch + validator.toMatchResult
   - finalizeMatchFromPayload: accept sport + generic payload via validator
   - Export pool types from pool.ts for backward compatibility

3. UPDATE server/src/routes/leagues/captain.ts and admin.ts resolve handler:
   - Load match.sport before validating payload
   - Use getScoresheetValidator(match.sport).validate(...)

4. UPDATE client types:
   - client/src/types/captain.ts — add SportScoresheetPayload union (pool today)
   - Keep PoolScoresheetPayload exported; captain UI unchanged for pool

5. ADD minimal unit-style tests OR a dev script that asserts:
   - pool validator rejects invalid payloads
   - pool validator payloadsMatch works for matching/differing scores

Do NOT implement darts/volleyball validators yet — only the router + pool migration.

Acceptance criteria:
- Existing pool captain workflow unchanged (submit → confirm → final → standings)
- Dispute flow still works
- npm run build passes in client and server
- getScoresheetValidator('darts') throws a clear error (not pool validation)
- No duplicate pool validation logic outside pool.ts
```

---

## PHASE L2: Pool Polish (1.1)

**Goal:** Expose deferred pool features for pilot bars that need format or handicap support.

**Branch:** `feat/leagues-l2-pool-polish`  
**Note:** L2.2 is optional — skip if pilot bar runs simple 8-ball team race only.

---

### Prompt L2.1 — Pool format admin + match fields

```
Read docs/leagues/SCHEMAS.md (PoolMatch section) and LeagueDetailPage.tsx.

poolFormat exists on PoolMatch discriminator but is not set in UI or schedule generator.

1. UPDATE admin league create/edit (AdminLeaguesPage or LeagueDetailPage):
   - When sport === 'pool', show format dropdown: 8-Ball / 9-Ball
   - Store on league or default per match — prefer setting poolFormat on each 
     PoolMatch at schedule generation time from league-level default

2. UPDATE server schedule generator (roundRobin.ts or admin route):
   - Accept optional poolFormat param
   - When creating PoolMatch documents, set poolFormat ('8_ball' | '9_ball')

3. UPDATE public LeaguePublicPage match list:
   - Show small badge "8-Ball" or "9-Ball" on pool matches when poolFormat set

4. UPDATE docs/leagues/SCHEMAS.md — mark poolFormat as @implemented

Acceptance criteria:
- New pool league can default to 8_ball or 9_ball
- Generated matches carry poolFormat
- Public schedule shows format badge
- Existing leagues without poolFormat still render (no crash)
```

---

### Prompt L2.2 — APA/VNEA handicap scaffolding (optional)

```
Read Division.handicapRules in server/src/models/leagues/Division.ts.

Handicap math is deferred but pilot bars may need to STORE rules before v1.1 math ships.

1. DEFINE TypeScript interface in server/src/types/leagues.ts (or constants):
   PoolHandicapRules { system: 'apa' | 'vnea' | 'none'; skillLevelRange?: [number, number]; 
     handicapPerSkillLevel?: number }

2. UPDATE admin division form on LeagueDetailPage:
   - Optional "Handicap system" dropdown: None / APA / VNEA
   - When not None, show numeric fields for skill level range and points per level
   - PATCH division with typed handicapRules object

3. UPDATE server division PATCH validation:
   - Validate handicapRules shape when present; reject unknown systems

4. DO NOT change PoolStandingsEngine yet — storage + admin UI only
   - Add comment in PoolStandingsEngine: "// TODO: apply handicapRules in v1.1"

5. UPDATE SCHEMAS.md — mark PoolHandicapRules as @implemented (storage), 
   standings application as @planned

Acceptance criteria:
- Division can save and reload handicap rules
- Standings unchanged (still W-L-T only)
- Invalid handicap payload returns 400
```

---

## PHASE L3: Darts Module

**Goal:** Runnable end-to-end darts league using shared infrastructure.

**Prerequisite:** Phase L1 complete.  
**Default format:** Team legs (501-style race — `{ homeLegsWon, awayLegsWon }`) — simplest bar format.  
**Branch:** `feat/leagues-l3-darts`

---

### Prompt L3.1 — Darts models + standings engine

```
Read docs/leagues/SCHEMAS.md planned DartsMatch section and PoolStandingsEngine.ts.

1. EXTEND server/src/models/leagues/Match.ts:
   - IDartsMatch interface: dartsFormat: '501' | '301' | 'cricket'; legsToWin?: number; 
     isDoubles?: boolean
   - DartsMatch discriminator on Match model (sport key 'darts')
   - Export from models/leagues/index.ts

2. CREATE server/src/services/leagues/standings/DartsStandingsEngine.ts:
   - Same points rules as pool for v1: W=2, T=1, rank by points → wins → fewer losses
   - homeScore/awayScore from match.result = legs won
   - Implement StandingsEngine interface

3. UPDATE server/src/services/leagues/standings/index.ts:
   - case 'darts': return dartsStandingsEngine

4. UPDATE admin league create + schedule generate:
   - When sport === 'darts', create DartsMatch documents (default dartsFormat: '501', 
     legsToWin: 2 for team race)
   - Reject schedule generate for darts if league.format !== 'round_robin' (same as pool)

5. UPDATE docs/leagues/SCHEMAS.md — DartsMatch @implemented, DartsStandingsEngine @implemented

Acceptance criteria:
- Admin can create darts league, divisions, teams, generate round-robin schedule
- Manual DB finalization OR admin resolve produces standings via DartsStandingsEngine
- GET /api/leagues/:id/standings works for darts league
- npm run build passes
```

---

### Prompt L3.2 — Darts scoresheet + captain/admin UI

```
Prerequisite: L1.1 scoresheet router + L3.1 models.

1. CREATE server/src/services/leagues/scoresheets/darts.ts:
   - DartsScoresheetPayload: { homeLegsWon: number; awayLegsWon: number }
   - validate, payloadsMatch, toMatchResult (mirror pool.ts structure)

2. WIRE into scorersheets/index.ts getScoresheetValidator('darts')

3. UPDATE client/src/types/captain.ts — DartsScoresheetPayload

4. REFACTOR client/src/pages/captain/CaptainPage.tsx:
   - Fetch match.sport from captain matches API (add sport to response if missing)
   - Render PoolScoresheetForm OR DartsScoresheetForm based on sport
   - Darts form labels: "Our legs won" / "Their legs won" (same home/away semantics as pool)

5. UPDATE LeagueDetailPage dispute resolver:
   - Sport-aware resolve form (legs won fields for darts)

6. UPDATE public LeaguePublicPage:
   - Match results show "X–Y legs" for darts

Acceptance criteria:
- Full darts loop: captain dual-entry → final → standings
- Dispute + admin resolve works for darts
- Pool captain flow regression-free
- Captain cannot submit pool payload to darts match (400)
```

---

## PHASE L4: Volleyball Module

**Goal:** Runnable end-to-end volleyball league — primary greenfield pitch sport.

**Prerequisite:** Phase L1 complete.  
**Default:** Best of 3 sets (`setsToWin: 2`).  
**Branch:** `feat/leagues-l4-volleyball`

---

### Prompt L4.1 — Volleyball models + standings engine

```
Read docs/leagues/SCHEMAS.md planned VolleyballMatch section.

1. EXTEND server/src/models/leagues/Match.ts:
   - IVolleyballMatch: setsToWin: 2 | 3 (best of 3 or 5)
   - VolleyballMatch discriminator (sport key 'volleyball')

2. CREATE server/src/services/leagues/standings/VolleyballStandingsEngine.ts:
   - W-L-T points same as pool/darts v1
   - Match result: homeScore/awayScore = sets won by each team

3. UPDATE standings/index.ts — case 'volleyball'

4. UPDATE admin schedule generate for volleyball:
   - Default setsToWin: 2
   - Optional admin field on league detail when sport is volleyball

5. UPDATE SCHEMAS.md

Acceptance criteria:
- Volleyball league schedule generates VolleyballMatch documents
- Standings compute from finalized matches
- Public standings API works
```

---

### Prompt L4.2 — Volleyball scoresheet + captain/admin UI

```
Prerequisite: L1.1 + L4.1.

1. CREATE server/src/services/leagues/scoresheets/volleyball.ts:
   - VolleyballScoresheetPayload: { homeSetWins: number; awaySetWins: number }
   - Validation: one team must reach setsToWin from match document (load match for validate)
   - toMatchResult: homeScore/awayScore = set wins

2. WIRE validator into router

3. UPDATE CaptainPage — VolleyballScoresheetForm ("Our sets won" / "Their sets won")

4. UPDATE LeagueDetailPage dispute resolver for volleyball

5. UPDATE public match display — "X–Y sets" label

Acceptance criteria:
- Full volleyball captain loop works
- Validation rejects impossible scores (e.g. 2–2 when setsToWin=2 and match should end 2–0, 2–1)
- Pool and darts regression-free
```

---

## PHASE L5: Cross-Sport Venue Features

**Goal:** Multi-sport venue experience and production-ready auth.

**Branch:** `feat/leagues-l5-cross-sport`

---

### Prompt L5.1 — `league_admin` role + route gating

```
Read server/src/middleware/requireRole.ts and routes/leagues/admin.ts.

league_admin exists on User model but all league admin routes only use checkJwt.

1. CREATE server/src/middleware/requireLeagueAdmin.ts OR extend requireRole:
   - Allows manager OR league_admin
   - staff → 403 on league write routes

2. APPLY to server/src/routes/leagues/admin.ts router:
   - GET routes: manager | staff | league_admin (read)
   - POST/PATCH/DELETE/import/resolve/recalculate: manager | league_admin only

3. UPDATE admin sidebar:
   - Leagues nav visible to league_admin users
   - Hide site settings pages from league_admin (Overview ok if read-only)

4. UPDATE seed script or document assigning league_admin role in SETUP_AUTH0.md

5. Admin UI: when user is league_admin, hide sportsEnabled toggle on AdminLeaguesPage 
   (managers only) — or return 403 from API if league_admin attempts PUT site settings

Acceptance criteria:
- league_admin can CRUD leagues, resolve disputes, import CSV
- league_admin cannot PUT /api/admin/site
- staff can view leagues but not create/delete
- manager retains full access
```

---

### Prompt L5.2 — Captain Auth0 invite / onboarding

```
Today captains require manual auth0Sub paste in admin or seedCaptain.ts.

1. ADD admin action on LeagueDetailPage team row: "Invite captain"
   - Requires captain email on Player record
   - POST /api/admin/leagues/:leagueId/teams/:teamId/invite-captain
   - Server: create or update User { role: 'captain', playerId, email }
   - Phase 1 approach (no Auth0 Management API): generate magic link instructions
     OR document Auth0 invitation workflow in SETUP_AUTH0.md with step-by-step

2. IF implementing Auth0 Management API (optional, env-gated):
   - AUTH0_MGMT_CLIENT_ID, AUTH0_MGMT_CLIENT_SECRET
   - Create user + send passwordless/email invite
   - On first login, link auth0Sub to User record

3. UPDATE captain login page copy: "Use the email your league manager invited"

4. Handle existing captain with auth0Sub — invite button disabled, show "Linked"

Acceptance criteria:
- Documented path from team captain email → captain can log in at /captain/login
- Captain sees only their team's matches after login
- No regression for manually seeded captains
```

---

### Prompt L5.3 — Venue leagues dashboard (all sports)

```
Create a unified admin view of all leagues across sports.

1. CREATE client/src/pages/admin/LeaguesOverviewPage.tsx (or enhance AdminLeaguesPage):
   - Summary cards: active leagues by sport, disputed matches count, upcoming matches this week
   - Table: all leagues with sport badge, status, division count, disputed count
   - Quick links to /admin/leagues/:id

2. ADD server endpoint GET /api/admin/leagues/overview:
   - { activeBySport, disputedMatches, upcomingMatchCount, leagues: [...] }

3. ADD route /admin/leagues overview as index or separate /admin/leagues-dashboard
   - Prefer making AdminLeaguesPage the hub with summary section at top

Acceptance criteria:
- Manager sees pool + darts + volleyball leagues in one list
- Disputed matches surface with link to resolve on league detail
- Empty state friendly when no leagues
```

---

### Prompt L5.4 — Player self-service portal

```
Phase 4 player registration — lightweight v1.

1. EXTEND Player model usage:
   - Player.auth0Sub optional for non-captain players
   - role: 'player' on User OR use captain role only for scoresheet duties (simpler: 
     new role 'player' with read-only league access)

2. CREATE public/authenticated routes:
   GET /api/player/leagues — leagues where playerId in any team.playerIds
   GET /api/player/leagues/:id/standings — read-only

3. CREATE client/src/pages/player/PlayerPage.tsx:
   - /player — list my leagues across sports
   - Standings read-only per league
   - No scoresheet submit (captains only)

4. Admin: optional "Invite player" email on roster row (future registration)

Acceptance criteria:
- Player with linked User can see leagues they belong to
- Cannot access captain submit or admin routes
- Works for player in both pool and darts leagues at same venue
```

---

### Prompt L5.5 — Homepage leagues preview section

```
Mirror EventsSection pattern for leagues on the public homepage.

1. CREATE client/src/components/public/LeaguesSection/index.tsx:
   - usePublicLeagues() hook — fetch GET /api/leagues (limit 3 active)
   - If leagues.length > 0: show 2–3 league cards with sport badge + link to /leagues/:id
   - If empty: return null (no section — leagues are optional module)
   - Link "All leagues →" to /leagues

2. ADD to HomePage.tsx after EventsSection (or before footer)

3. Style consistent with EventsSection / dark pub theme

Acceptance criteria:
- Homepage shows leagues only when active leagues exist
- No error state when leagues disabled or empty
- Mobile responsive
```

---

## PHASE L6: Schedule Formats + Migration

**Goal:** Advanced formats and CompuSport migration when samples exist.

**Branch:** `feat/leagues-l6-schedules-migration`  
**Note:** L6.2 blocked until real CompuSport export from pilot bar.

---

### Prompt L6.1 — Ladder + bracket schedule generators

```
round_robin is implemented. ladder and bracket are selectable but unsupported.

1. CREATE server/src/services/leagues/schedule/ladder.ts:
   - Input: teamIds[], startDate, weeksBetweenRounds
   - Output: matches with roundNumber incrementing; bottom vs top pairing pattern

2. CREATE server/src/services/leagues/schedule/bracket.ts:
   - Single-elimination bracket for N teams (pad to power of 2 with byes)
   - Assign scheduledAt per round

3. UPDATE POST .../schedule/generate:
   - Switch on league.format: round_robin | ladder | bracket
   - Return 400 with clear message if team count invalid for bracket

4. UPDATE LeagueDetailPage:
   - Enable Generate Schedule for ladder/bracket with explanation copy
   - Disable or warn when team count < 2

5. UPDATE LEAGUES.md and SCHEMAS.md

Acceptance criteria:
- Each format generates matches with valid team pairings
- Existing round_robin unchanged
- Admin UI shows which format is active
```

---

### Prompt L6.2 — CompuSport CSV column mapping

```
BLOCKED until a real CompuSport export is available. When sample arrives:

Read docs/leagues/CSV_IMPORT.md.

1. ADD server/src/services/leagues/import/compusportAliases.ts:
   - Map CompuSport column headers → canonical import columns
   - Unit test with anonymized sample CSV committed to server/src/__fixtures__/

2. UPDATE csvImport.ts:
   - detectImportFormat(headers): 'canonical' | 'compusport'
   - Auto-apply alias mapping before validation

3. UPDATE CSV_IMPORT.md with real column names and example rows

4. UPDATE admin import UI — show detected format label

Acceptance criteria:
- Pilot bar CompuSport export imports without manual column renaming
- Canonical CSV still works
- No PII in committed fixtures
```

---

### Prompt L6.3 — CSV historical results import

```
Extend import to backfill finalized matches + standings.

1. ADD results.csv support to CSV_IMPORT.md:
   Columns: divisionName, homeTeamName, awayTeamName, scheduledAt, homeScore, awayScore, status

2. UPDATE csvImport.ts:
   - Import results rows as Match status=final with result
   - Skip if match already exists (idempotent by teams + date)
   - After import: trigger recomputeStandingsForLeague

3. UPDATE admin import UI — checkbox "Import match results (historical)"

Acceptance criteria:
- Import historical results → standings reflect imported wins/losses
- Does not overwrite existing finalized matches
- Dispute workflow not triggered for imported finals
```

---

## PHASE L7: Platform Hardening

**Goal:** Licensing enforcement, documentation, automated confidence.

**Branch:** `feat/leagues-l7-hardening`

---

### Prompt L7.1 — Establishment module enforcement

```
Read config/establishment.json modules.leagues pattern.

sportsEnabled is staff-controlled but licensing tier is not enforced server-side.

1. CREATE server/src/config/establishment.ts (or extend existing):
   - Load establishment.json at boot
   - modules.leagues: { pool: boolean, darts: boolean, volleyball: boolean }

2. CREATE middleware or helper assertSportLicensed(sport):
   - POST create league: reject if sport not licensed
   - PUT sportsEnabled: cannot enable sport not in license
   - Public GET /api/leagues: filter to licensed sports

3. Admin UI: sportsEnabled toggles disabled with tooltip when sport not licensed

4. UPDATE establishment.example.json with modules.leagues example

Acceptance criteria:
- Deployment with pool-only license cannot create darts league via API
- Staff cannot enable unlicensed sport in dashboard
- Licensed sports work as today
```

---

### Prompt L7.2 — Docs + AGENTS.md update

```
League module shipped but core docs are stale.

1. UPDATE docs/LEAGUES.md status section — Phase L0 complete, link to LEAGUES_BUILD_PROMPTS.md

2. UPDATE AGENTS.md:
   - Add league routes to public/admin tables
   - Add league non-negotiables
   - Add captain portal routes

3. UPDATE docs/architecture/ARCHITECTURE.md:
   - League collections, auth roles, request flow diagram
   - Captain vs admin vs public paths

4. UPDATE docs/PLATFORM.md — leagues capability table

5. UPDATE docs/README.md current feature summary — leagues line item

6. UPDATE claude-files/README.md — leagues in shipped features

Acceptance criteria:
- New agent session can orient from AGENTS.md alone
- LEAGUES.md no longer says "no league code in repo"
```

---

### Prompt L7.3 — Standings / scoresheet integration tests

```
Add automated tests for critical league math and workflow.

1. SET UP test runner if not present (vitest or jest in server)

2. TEST PoolStandingsEngine:
   - Round robin partial results → expected ranks
   - Tiebreaker: points → wins → fewer losses

3. TEST evaluateScoresheets (pool):
   - One captain submits → pending
   - Matching submits → final + standings snapshot
   - Mismatched → disputed

4. TEST roundRobin.ts:
   - 4 teams → 6 matches, each team plays each other once

5. Add npm run test:server script at repo root

Acceptance criteria:
- Tests run in CI without MongoDB (use mongodb-memory-server or mock models)
- Core standings + scoresheet scenarios covered
- npm run test passes locally
```

---

## PHASE L8: Tournaments & Individual Entrants

**Goal:** One-night knockout events where entrants are **players** (or fixed pairs), not bar teams with rosters and captains.

**Product insight:** `format: 'bracket'` is schedule machinery shared by leagues and tournaments. The real split is **`entrantType`** — teams vs individuals — plus **`kind`** — season league vs short tournament.

**Pilot order (resolved):** **Darts 501 singles first**, then pool 9-ball singles. See comparison below.

**Branch convention:** `feat/leagues-l8-{short-name}`

### Pool 9-ball singles vs Darts 501 singles — design comparison

| Dimension | Pool 9-ball singles (tournament) | Darts 501 singles (tournament) |
|-----------|----------------------------------|--------------------------------|
| **Typical venue use** | Saturday APA-style singles draw; 16–32 players | Weekly knockout; 8–16 players; very common at bars |
| **Entrant** | Individual `Player` | Individual `Player` |
| **Match unit** | One table, two players, **race to N games** | One board, two players, **best of legs** (`legsToWin`) |
| **Scoresheet shape** | `{ homeRaceWins, awayRaceWins }` works mathematically but was built for **team** race aggregates | `{ homeLegsWon, awayLegsWon }` maps **1:1** to a singles match today |
| **Per-match config** | Needs `raceTo` on match (5 early / 7 finals); handicap spots optional (APA) | `legsToWin: 2` already on `DartsMatch`; `dartsFormat: '501'` |
| **Handicap** | Common (skill level → spot games) — `Division.handicapRules` storage exists; math deferred | Rare in casual bar knockouts; defer for v1 |
| **Workflow** | No captains — both players or staff confirm result | Same — individual dual-confirm, not captain portal |
| **Standings** | Placement (1st, 2nd, 3rd…) not season W-L | Same |
| **Build complexity** | Medium — `raceTo`, 9-ball default, optional handicap display | **Low** — reuse legs validator; add entrant model + workflow |

**League formats (unchanged — not tournaments):**

- **Pool 8-ball team race** — five players per side, `homeRaceWins` = team match score. CompuSport bread-and-butter.
- **Darts team legs** — four boards, aggregate legs; same `homeLegsWon` payload but entrant is still a **team**.

**Do not** fake singles with one-player teams — captain portal, roster UI, and standings labels all say "team" and confuse staff.

---

### Prompt L8.1 — League `kind` + `entrantType`

```
Read docs/leagues/SCHEMAS.md and server/src/models/leagues/League.ts.

Tournaments need a product shell distinct from season leagues. Individual entrants need a first-class type.

1. EXTEND League model + constants:
   - kind: 'league' | 'tournament' (default 'league')
   - entrantType: 'team' | 'player' (default 'team')
   - Validation rules:
     - tournament → format must be 'bracket' (v1; round-robin tourneys deferred)
     - tournament → seasonEnd - seasonStart <= 14 days (soft warn in UI, hard reject > 60 days)
     - entrantType 'player' → kind can be 'league' or 'tournament' (singles ladder deferred)
     - poolFormat / dartsFormat defaults enforced per sport when kind === 'tournament'

2. UPDATE admin league create/edit (LeaguesPage + POST/PATCH routes):
   - When kind === 'tournament': show "Tournament" label, lock format to bracket, shorter default season window
   - When entrantType === 'player': hide team-centric copy; show "Players" section instead (wired in L8.2)
   - Team leagues unchanged

3. UPDATE client types + GET responses

4. UPDATE docs/leagues/SCHEMAS.md — ILeague fields @implemented

Acceptance criteria:
- Admin can create tournament with entrantType player or team
- API rejects tournament + round_robin (400)
- Existing team leagues unaffected (migration: missing fields default team/league)
- npm run build passes
```

---

### Prompt L8.2 — Player-entrant roster (no teams)

```
Prerequisite: L8.1.

When entrantType === 'player', divisions hold a player list — not teams.

1. ADD Division.playerIds: ObjectId[] (ref Player) OR separate DivisionEntrant collection — prefer playerIds on Division for v1

2. ADMIN UI on LeagueDetailPage when entrantType === 'player':
   - "Add player" — pick existing venue player or create inline (name, email)
   - Reorder / remove entrants
   - Seed order = array order (bracket seeding uses this)
   - No team CRUD, no captain assignment

3. ADMIN API:
   - POST /api/admin/leagues/:leagueId/divisions/:divisionId/entrants
   - DELETE .../entrants/:playerId
   - PATCH .../entrants/reorder { playerIds: string[] }

4. CSV import: optional `entrants` type — player_name, email, division (skip if heavy; document in CSV_IMPORT.md)

Acceptance criteria:
- Player-entrant division can hold 4–64 players without any Team documents
- Team-entrant leagues still use Team CRUD only
- Player portal shows tournament in "my leagues" when playerId in division.playerIds
```

---

### Prompt L8.3 — Player-vs-player matches + bracket seeding

```
Prerequisite: L8.1, L8.2.

Match model is team-only today (homeTeamId/awayTeamId required). Extend without breaking team leagues.

1. EXTEND Match model:
   - homePlayerId?: ObjectId; awayPlayerId?: ObjectId (ref Player)
   - Validation: exactly one pairing mode per match:
     (homeTeamId + awayTeamId) XOR (homePlayerId + awayPlayerId)
   - IMatchResult.winnerPlayerId?: ObjectId (when player match)
   - Indexes unchanged; add sparse index on homePlayerId

2. UPDATE bracket.ts + admin schedule generate:
   - When entrantType === 'player': seed from division.playerIds order
   - generateBracketPairings accepts entrant ids (rename param; team path unchanged)
   - Create matches with homePlayerId/awayPlayerId; roundNumber + bye logic same as teams

3. UPDATE public + captain/admin match list formatters:
   - Display player names when player match (homePlayerName vs awayPlayerName)

4. Bracket advancement placeholder: same as teams (winner feeds next round slot) — use winnerPlayerId on finalize

Acceptance criteria:
- 8-player darts tournament generates 7 player-vs-player matches
- Team bracket regression-free
- GET /api/leagues/:id/schedule returns player names for player matches
```

---

### Prompt L8.4 — Individual entrant scoresheet workflow

```
Prerequisite: L8.3.

Captain dual-entry assumes team captains. Individual matches need player-scoped submit.

1. NEW workflow for entrantType === 'player' matches:
   - Either participant (home or away player) may submit scoresheet
   - submittedBy remains 'home' | 'away' based on player's side
   - Dual-entry: both sides submit matching payload → final (same evaluateScoresheets path)
   - Player must be linked (auth0Sub on Player) and be homePlayerId or awayPlayerId

2. ROUTES:
   - Reuse POST /api/captain/matches/:matchId/scoresheet OR add POST /api/player/matches/:matchId/scoresheet
   - Prefer extending player portal route with match-scoped auth (player cannot submit other tables)

3. ADMIN override: existing dispute resolve works — sport-aware payload unchanged

4. UI:
   - Player portal: "Submit score" on upcoming player matches (not captain portal)
   - Hide captain portal for players who are not team captains (unchanged)
   - Tournament admin: optional "Staff enter result" shortcut (admin PATCH match result) for venues without player logins

5. UPDATE non-negotiables in CONTEXT_leagues.md:
   - Team leagues: captain dual-entry (unchanged)
   - Player-entrant: participant dual-entry OR admin finalize

Acceptance criteria:
- Two linked players submit matching legs/race wins → match final
- Player A cannot submit for match where they are not home/away player
- Admin can force-finalize tournament match without player accounts
- Team captain flow regression-free
```

---

### Prompt L8.5 — Darts 501 singles tournament (end-to-end pilot)

```
Prerequisite: L8.1–L8.4.

First full tournament product — lowest risk because DartsScoresheetPayload already fits 1v1.

1. TOURNAMENT PRESET on league create:
   - sport: darts, kind: tournament, entrantType: player, format: bracket
   - dartsFormat: '501', legsToWin: 2 on generated DartsMatch documents
   - isDoubles: false

2. ADMIN wizard copy: plain English — "Singles knockout", "Add players", "Generate bracket"

3. PLAYER PORTAL: tournament schedule + submit legs (L8.4)

4. PUBLIC /leagues/:id:
   - Bracket-style schedule grouped by round
   - Results: "Matt def. Chris 2–1 legs"
   - No season standings table — link to placement (L8.6) or hide until complete

5. TEST: add bracket + darts singles finalize case to server tests (optional but encouraged)

Acceptance criteria:
- Staff can run 8-player Saturday 501 tournament without creating any Team
- Full loop: bracket → dual player entry → final → public schedule shows winner
- npm run build && npm run test:server pass
```

---

### Prompt L8.6 — Tournament placement standings

```
Prerequisite: L8.5 (or any player-entrant bracket with finals).

Season W-L standings are wrong for single-elimination tournaments.

1. WHEN kind === 'tournament' && format === 'bracket':
   - StandingsSnapshot entries use placement: 1..N instead of points/wins/losses
   - Compute from bracket tree: champion = 1, finalist = 2, semi losers = 3–4, etc.
   - Service: TournamentPlacementEngine in server/src/services/leagues/standings/

2. PUBLIC + admin standings API: return placement field; UI shows "1st", "2nd", "3rd"

3. Team season leagues: PoolStandingsEngine / DartsStandingsEngine unchanged

Acceptance criteria:
- Completed 8-player tournament shows 1–8 placement
- Round-robin team league standings unchanged
```

---

### Prompt L8.7 — Pool 9-ball singles tournament

```
Prerequisite: L8.1–L8.6.

Pool singles needs race-to-N per match; handicap display optional in v1.

1. EXTEND IPoolMatch:
   - raceTo: number (default 5; admin can set per division or per round in v1.1)
   - Apply on schedule generate for pool + entrantType player

2. TOURNAMENT PRESET:
   - sport: pool, kind: tournament, entrantType: player, format: bracket, poolFormat: '9_ball'
   - Scoresheet: existing homeRaceWins / awayRaceWins (interpret as games won in race)

3. VALIDATION in pool scoresheet validator when player match:
   - homeRaceWins + awayRaceWins can equal raceTo (e.g. 5–3, 5–4)
   - Winner must have >= raceTo (or strict win-by-2 if configured — defer)

4. OPTIONAL v1: show Division.handicapRules on match card as read-only "Handicap: APA" badge — no spot math

5. UI labels: "Games won" not "Race wins" on player tournament forms

Acceptance criteria:
- 9-ball singles bracket runs without teams
- raceTo enforced on scoresheet submit
- Darts tournament (L8.5) regression-free
```

---

### Prompt L8.8 — Public tournament page + docs

```
Prerequisite: L8.5 or L8.7.

1. PUBLIC UX:
   - /leagues lists kind === 'tournament' with badge "Tournament"
   - Tournament detail: bracket visualization (simple round columns; no fancy SVG required)
   - Empty state: friendly panel "Bracket not generated yet"

2. DOCS:
   - UPDATE LEAGUES.md — tournament vs league section, entrant types
   - UPDATE AGENTS.md — kind/entrantType, player scoresheet route
   - UPDATE SCHEMAS.md — all L8 fields
   - RESOLVE open decision "8-ball team race vs 9-ball singles" → both: team race = league, 9-ball singles = tournament

3. DEFER to later prompt: online registration, entry fee, check-in desk

Acceptance criteria:
- Public site distinguishes tournament from season league
- Docs orient new agent on L8 model
```

---

## Dependency graph

```mermaid
flowchart TD
  L0[L0 Pool — shipped]
  L1[L1 Sport abstraction — shipped]
  L2[L2 Pool polish — shipped]
  L3[L3 Darts — shipped]
  L4[L4 Volleyball — shipped]
  L5[L5 Cross-sport — shipped]
  L6[L6 Schedules + CSV — shipped]
  L7[L7 Hardening — shipped]
  L8[L8 Tournaments]

  L7 --> L8
  L8 --> L81[L8.1 kind + entrantType]
  L81 --> L82[L8.2 player roster]
  L82 --> L83[L8.3 player matches]
  L83 --> L84[L8.4 player scoresheet]
  L84 --> L85[L8.5 darts 501 pilot]
  L85 --> L86[L8.6 placement]
  L86 --> L87[L8.7 pool 9-ball]
  L85 --> L88[L8.8 public + docs]
  L87 --> L88
```

---

## Open decisions (resolve before corresponding prompt)

| # | Question | Blocks | Default if no answer |
|---|----------|--------|---------------------|
| 1 | ~~First darts format: team legs vs singles 501?~~ | — | **Both shipped** — team legs = league; singles 501 = L8.5 tournament |
| 2 | ~~Volleyball default: best of 3 or 5?~~ | — | Best of 3 *(shipped)* |
| 3 | ~~Auth0 Management API for captain invites?~~ | — | Manual invite *(shipped)* |
| 4 | CompuSport CSV sample from pilot bar? | L6.2 | Skip until sample arrives |
| 5 | ~~`player` role vs read-only captain?~~ | — | `player` role *(shipped)* |
| 6 | Player dual-entry vs staff-only for tournaments? | L8.4 | Dual-entry when player has account; admin override always available |
| 7 | ~~Pool singles: fixed raceTo per bracket vs per round?~~ | — | Single raceTo per division (default 5) *(shipped L8.7)* |
| 8 | Doubles pair entrant (`entrantType: 'pair'`)? | Post-L8 | Defer — document in SCHEMAS.md as @planned |
| 9 | ~~8-ball team race vs 9-ball singles tournament?~~ | — | **Both** — 8-ball team race = `kind: 'league'`; 9-ball singles = `kind: 'tournament'` *(shipped L8.8)* |

---

## Related docs

| Document | Purpose |
|----------|---------|
| [CONTEXT_leagues.md](../contexts/CONTEXT_leagues.md) | Attach to every league prompt |
| [LEAGUES.md](../LEAGUES.md) | Product plan and pitch positioning |
| [leagues/SCHEMAS.md](../leagues/SCHEMAS.md) | TypeScript schema reference |
| [leagues/CSV_IMPORT.md](../leagues/CSV_IMPORT.md) | Canonical CSV format |
| [BUILD_PROMPTS.md](./BUILD_PROMPTS.md) | Original site build prompts (Phases 0–4) |
