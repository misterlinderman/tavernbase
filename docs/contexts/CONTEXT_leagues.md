# League Module — AI Session Context

**Use when:** Building or editing league models, routes, standings engines, captain portal, public `/leagues` pages, or admin league management.

**Parent plan:** [LEAGUES.md](../LEAGUES.md)  
**Schema reference:** [leagues/SCHEMAS.md](../leagues/SCHEMAS.md)  
**Build prompts:** [prompts/LEAGUES_BUILD_PROMPTS.md](../prompts/LEAGUES_BUILD_PROMPTS.md)  
**CSV migration:** [leagues/CSV_IMPORT.md](../leagues/CSV_IMPORT.md)

---

## What exists today (June 2026)

**All three sports are end-to-end.** A venue can run pool, darts, or volleyball leagues: admin CRUD, schedule generation (round-robin, ladder, bracket), dual-entry captain scoresheets, computed standings, public pages, CSV import, captain invite, player read-only portal, and establishment licensing enforcement.

### Shipped features

| Area | Status |
|------|--------|
| Models | League, Division, Team, Player, Match (+ pool/darts/volleyball discriminators), Scoresheet, StandingsSnapshot |
| Licensing | `modules.leagues` in `establishment.json` — `server/src/config/establishment.ts` |
| `SiteSettings.sportsEnabled` | Admin toggle + public API (intersected with license) |
| Admin CRUD | `/admin/leagues`, `/admin/leagues/:id` — overview, import, disputes |
| Schedule | Round-robin, ladder, bracket generators |
| Scoresheets | Sport-aware router — pool, darts, volleyball validators |
| Standings | `PoolStandingsEngine`, `DartsStandingsEngine`, `VolleyballStandingsEngine` |
| Captain portal | `/captain` — dual-entry scoresheets (team leagues), invite onboarding |
| Player portal | `/player` — standings; individual-match score entry at `/player/scores` |
| Public pages | `/leagues`, `/leagues/:leagueId`, homepage `LeaguesSection` |
| CSV import | Teams, players, schedule, historical results; CompuSport aliases |
| Pool polish | 8-ball / 9-ball format; APA/VNEA handicap storage (math deferred v1.1) |
| Roles | `league_admin`, `captain`, `player` enforced on routes |

### Remaining / deferred

| Area | Notes |
|------|-------|
| APA/VNEA handicap math | Storage only — apply in standings v1.1 |
| Bracket winner advancement | Schedule placeholders; auto-advance on final not yet built |
| L7.3 integration tests | Standings + scoresheet automated tests — `npm run test:server` |

---

## Critical non-negotiables

1. **Standings are computed** from finalized match results — never hand-edited without audit trail.
2. **Team leagues:** a match is not `final` until both captains confirm matching scoresheets (or admin resolves a dispute).
3. **Player-entrant leagues:** either both linked participants submit matching scoresheets, or league staff finalize via admin.
4. All `/api/admin/leagues/*`, `/api/captain/*`, and `/api/player/*` routes require Auth0 JWT.
5. Captain routes are **team-scoped** — captains cannot submit for another team's match.
6. Player score routes are **match-scoped** — a player cannot submit for a match they are not in.
7. Public pages show only **active/completed** leagues and **final** match results.
8. Empty league state → friendly empty panel (`LeaguesEmptyPanel`), never an error.
9. Never bypass dual-entry for team leagues. Player-entrant may use admin finalize when players have no logins.

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
POST  /api/captain/activate
GET   /api/captain/profile
GET   /api/captain/matches
POST  /api/captain/matches/:matchId/scoresheet
```

### Player — `checkJwt` + `requirePlayer`

```
POST  /api/player/activate
GET   /api/player/leagues
GET   /api/player/leagues/:id/standings
```

---

## Auth roles

| Role | Access |
|------|--------|
| `manager` | Full admin including leagues, disputes, CSV import, site settings |
| `staff` | Dashboard + league read; write requires manager or `league_admin` |
| `league_admin` | League CRUD, disputes, import — no site settings |
| `captain` | Scoresheet submit for assigned team via `User.playerId` |
| `player` | Read-only `/player` portal for rostered leagues |

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
