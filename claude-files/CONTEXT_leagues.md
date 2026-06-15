# League Module — AI Session Context

**Use when:** Building or editing league models, routes, standings engines, captain portal, public `/leagues` pages, or admin league management.

**Parent plan:** [LEAGUES.md](../docs/LEAGUES.md)  
**Schema reference:** [leagues/SCHEMAS.md](../docs/leagues/SCHEMAS.md)  
**Build prompts:** [LEAGUES_BUILD_PROMPTS.md](./LEAGUES_BUILD_PROMPTS.md)  
**CSV migration:** [leagues/CSV_IMPORT.md](../docs/leagues/CSV_IMPORT.md)

---

## What exists today (June 2026)

**Pool is end-to-end.** A bar can create a round-robin pool league, assign captains, generate a schedule, run dual-entry scoresheets, auto-calculate standings, and publish public standings/schedule pages.

**Darts and volleyball** can be created in admin (sport field, toggles) but standings engines, sport-specific match discriminators, and scoresheet UIs are **not implemented**. Creating matches for those sports will fail at standings recalc.

### Shipped features

| Area | Status |
|------|--------|
| Models | League, Division, Team, Player, Match, PoolMatch, Scoresheet, StandingsSnapshot |
| `SiteSettings.sportsEnabled` | Admin toggle + public API |
| Admin CRUD | `/admin/leagues`, `/admin/leagues/:id` |
| Schedule | Round-robin generator only |
| Captain portal | `/captain` — pool race-wins scoresheet |
| Standings | `PoolStandingsEngine` — win=2pts, tie=1pt |
| Public pages | `/leagues`, `/leagues/:leagueId` |
| CSV import | Teams, players, schedule (canonical format) |
| Disputes | Admin resolve on `LeagueDetailPage` |

### Not shipped

| Area | Notes |
|------|-------|
| `DartsMatch` / `VolleyballMatch` discriminators | Schema planned in SCHEMAS.md |
| `DartsStandingsEngine` / `VolleyballStandingsEngine` | `getEngineForSport()` throws |
| Sport-aware scoresheet routing | `getScoresheetValidator()` — pool only; darts/volleyball throw until L3/L4 |
| Ladder / bracket schedule | Format selectable; generator is round-robin only |
| Pool 8-ball / 9-ball UI | `poolFormat` on model, not exposed |
| APA/VNEA handicap math | `handicapRules` storage only |
| `league_admin` role enforcement | Role exists on User; routes use manager/staff |
| Captain Auth0 invite flow | Manual `auth0Sub` paste or `seedCaptain.ts` |
| `modules.leagues` in establishment.json | Not enforced server-side |
| Player self-service | Phase 4 |
| Homepage leagues preview | Nav link only |

---

## Critical non-negotiables

1. **Standings are computed** from finalized match results — never hand-edited without audit trail.
2. A match is not `final` until both captains confirm matching scoresheets (or admin resolves dispute).
3. All `/api/admin/leagues/*` and `/api/captain/*` routes require Auth0 JWT.
4. Captain routes are **team-scoped** — captains cannot submit for another team's match.
5. Public pages show only **active/completed** leagues and **final** match results.
6. Empty league state → friendly empty panel (`LeaguesEmptyPanel`), never an error.
7. Never bypass dual-entry scoresheet workflow for production leagues.

---

## Key file paths

```
server/src/
├── models/leagues/
│   ├── League.ts, Division.ts, Team.ts, Player.ts
│   ├── Match.ts              # PoolMatch discriminator only
│   ├── Scoresheet.ts, StandingsSnapshot.ts
├── constants/leagues.ts
├── routes/leagues/
│   ├── admin.ts              # CRUD, schedule, import, disputes
│   ├── captain.ts            # Profile, matches, submit
│   └── public.ts             # List, detail, standings, matches
├── services/leagues/
│   ├── scoresheet.ts         # Workflow orchestration
│   ├── scoresheets/          # Sport validators (pool; darts/volleyball L3/L4)
│   ├── standings/
│   │   ├── StandingsEngine.ts
│   │   ├── PoolStandingsEngine.ts
│   │   └── index.ts          # getEngineForSport, recompute
│   ├── schedule/roundRobin.ts
│   └── import/csvImport.ts
├── middleware/requireCaptain.ts
└── scripts/seedCaptain.ts

client/src/
├── pages/admin/AdminLeaguesPage.tsx, LeagueDetailPage.tsx
├── pages/captain/CaptainPage.tsx, CaptainLoginPage.tsx
├── pages/public/LeaguesPage.tsx, LeaguePublicPage.tsx
├── services/leagues.ts, captain.ts
├── types/leagues.ts, captain.ts
└── constants/leagues.ts
```

---

## API surface (implemented)

### Public — no auth

```
GET  /api/leagues                    → active/completed leagues (sport-gated)
GET  /api/leagues/:id                → league detail
GET  /api/leagues/:id/standings      → standings by division
GET  /api/leagues/:id/matches        → schedule + results
```

### Admin — `checkJwt` (manager/staff)

```
GET/POST        /api/admin/leagues
GET/PATCH/DELETE /api/admin/leagues/:leagueId
POST            /api/admin/leagues/:leagueId/divisions
PATCH/DELETE    /api/admin/leagues/:leagueId/divisions/:divisionId
POST            /api/admin/leagues/:leagueId/teams
PATCH/DELETE    /api/admin/leagues/:leagueId/teams/:teamId
GET/POST        /api/admin/leagues/:leagueId/players
POST            /api/admin/leagues/:leagueId/captain-users
POST            /api/admin/leagues/:leagueId/schedule/generate
GET             /api/admin/leagues/:leagueId/matches
POST            /api/admin/leagues/:leagueId/standings/recalculate
POST            /api/admin/leagues/:leagueId/matches/:matchId/resolve
POST            /api/admin/leagues/:leagueId/import
```

### Captain — `checkJwt` + `requireCaptain`

```
GET   /api/captain/profile
GET   /api/captain/matches
POST  /api/captain/matches/:matchId/scoresheet
```

---

## Auth roles

| Role | Access |
|------|--------|
| `manager` | Full admin including leagues, disputes, CSV import |
| `staff` | Dashboard access; league routes currently same as manager |
| `league_admin` | **Planned** — league CRUD only, no site settings |
| `captain` | Scoresheet submit for assigned team via `User.playerId` |

Captain link: `User.role === 'captain'`, `User.playerId` → `Player`, captain's team via `Team.captainPlayerId`.

---

## Scoresheet state machine

```
scheduled
  → home captain submits (status: submitted)
  → away captain submits
  → payloads match → both approved → match final → standings recalc
  → payloads differ → both disputed → admin resolves → final
```

Pool payload shape today:

```typescript
{ homeRaceWins: number; awayRaceWins: number }
```

Match `result.homeScore` / `result.awayScore` mirror race wins. Tie = no `winnerTeamId`.

---

## Standings engine pattern

```typescript
interface StandingsEngine {
  sport: Sport;
  computeDivisionStandings(leagueId, divisionId): Promise<ComputedStandingsEntry[]>;
}
```

Pool rules (v1): rank by points (W=2, T=1) → wins → fewer losses.

Snapshots materialize on match finalization. Public reads latest `StandingsSnapshot` per division.

---

## Patterns to mirror

| League concept | Existing pattern |
|----------------|----------------|
| Captain scoresheet → admin dispute | `Submission` moderation queue |
| Public empty state | `EvergreenPanel` / `LeaguesEmptyPanel` |
| Sport-specific logic | `eventSchedule.ts` server + client mirror |
| Admin CRUD | `routes/admin.ts` + `/admin/*` pages |
| Runtime sport toggle | `announcement.enabled` on SiteSettings |
| Module licensing | `config/establishment.json` (enforce in Phase L6) |

---

## Sport-specific targets (remainder)

### Darts (Phase L3)

- `DartsMatch`: `dartsFormat: '501' | '301' | 'cricket'`, `legsToWin`, `isDoubles`
- Scoresheet: `{ homeLegsWon, awayLegsWon }` for team leg formats
- Standings: same W-L-T points as pool unless format dictates otherwise

### Volleyball (Phase L4)

- `VolleyballMatch`: `setsToWin: 2 | 3` (best of 3 or 5)
- Scoresheet: `{ homeSetWins, awaySetWins, sets?: [{ home, away }] }` — sets array optional for v1
- Standings: set wins as scores; match win = team with more set wins

---

## Testing checklist (any league change)

- [ ] 0 active leagues → `LeaguesEmptyPanel` on `/leagues`
- [ ] Pool league with 0 finalized matches → standings empty or zeroed, not error
- [ ] Captain submits → opponent confirms → match `final` → standings update
- [ ] Mismatched scoresheets → `disputed` → admin resolve → `final`
- [ ] Captain cannot POST scoresheet for another team's match → 403
- [ ] Disabled sport not in `GET /api/leagues` list
- [ ] `npm run build` and `npm run lint` pass

---

## Related docs

| Document | Purpose |
|----------|---------|
| [CONTEXT_admin_dashboard.md](./CONTEXT_admin_dashboard.md) | Admin layout, toggles, toast patterns |
| [CONTEXT_server_models.md](./CONTEXT_server_models.md) | Mongoose conventions |
| [CONTEXT_public_site.md](./CONTEXT_public_site.md) | Public component patterns |
| [SETUP_AUTH0.md](../SETUP_AUTH0.md) | Captain/league_admin Auth0 setup |
