# League Module — Mongoose Schema Reference

**Status:** Living document — marks fields as **Implemented** or **Planned**  
**Last updated:** June 2026  
**Parent plan:** [LEAGUES.md](../LEAGUES.md)

Use this file to review data shapes before adding routes, UI, or sport-specific logic. Implemented fields match `server/src/models/leagues/`. Planned fields are documented here first; implement when the feature ships.

---

## Shared types

```typescript
type Sport = 'pool' | 'darts' | 'volleyball';
type LeagueFormat = 'round_robin' | 'ladder' | 'bracket';
type LeagueStatus = 'draft' | 'active' | 'completed';
type MatchStatus = 'scheduled' | 'in_progress' | 'final' | 'forfeit' | 'cancelled';
type ScoresheetStatus = 'draft' | 'submitted' | 'disputed' | 'approved';
type ScoresheetSide = 'home' | 'away';
type StaffRole = 'manager' | 'staff' | 'league_admin' | 'captain'; // captain/league_admin planned
```

---

## SiteSettings extension

Runtime sport toggles (staff dashboard). Licensing tier lives in `config/establishment.json`.

```typescript
/** @implemented */
interface SportsEnabled {
  pool: boolean;
  darts: boolean;
  volleyball: boolean;
}

/** @implemented — partial on ISiteSettings */
interface ISiteSettingsLeagues {
  sportsEnabled: SportsEnabled;
}
```

---

## League

One season of competition for a single sport.

```typescript
/** @implemented */
interface ILeague {
  _id: ObjectId;
  sport: Sport;
  name: string;                    // max 120
  seasonStart: Date;
  seasonEnd: Date;
  /** @implemented — L8.1 season league vs one-off tournament */
  kind: 'league' | 'tournament';   // default 'league'
  /** @implemented — L8.1 teams with rosters vs individual players */
  entrantType: 'team' | 'player';  // default 'team'
  format: LeagueFormat;            // default 'round_robin'; tournaments require 'bracket'
  status: LeagueStatus;            // default 'draft'
  poolFormat?: '8_ball' | '9_ball'; // @implemented — L2.1 pool leagues only
  /** @implemented — L10.1 self-service registration settings */
  registration: LeagueRegistrationSettings;
  createdAt: Date;
  updatedAt: Date;
}

/** @implemented — L10.1 */
interface LeagueRegistrationSettings {
  enabled: boolean;                // default false
  opensAt?: Date;
  closesAt?: Date;
  entryFeeCents?: number;          // default 0 — payment in L11
  currency: 'usd';                 // default 'usd'
  maxEntrants?: number;            // teams OR players depending on entrantType
  requiresApproval: boolean;       // default false
  waiverText?: string;
}

/** @planned — admin notes, legacy flags */
interface ILeaguePlanned {
  description?: string;
  maxTeamsPerDivision?: number;
  createdBy?: ObjectId;            // ref User
}
```

Remove registrationOpen from planned - it was replaced.

Also add Registration model to SCHEMAS.md

```typescript
/** @implemented — L10.1 */
interface IRegistration {
  _id: ObjectId;
  leagueId: ObjectId;
  divisionId?: ObjectId;
  entrantType: 'team' | 'player';
  status: RegistrationStatus;
  submittedByPlayerId: ObjectId;
  teamId?: ObjectId;
  playerIds?: ObjectId[];
  teamName?: string;
  waiverAccepted: boolean;
  waiverTextSnapshot: string;
  paymentId?: ObjectId;            // L11
  reviewedBy?: ObjectId;
  reviewedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

Replace the old ILeaguePlanned section in SCHEMAS.md

**Indexes (implemented):** `{ sport, status }`, `{ seasonStart, seasonEnd }`

---

## Division

Skill flight or tier within a league.

```typescript
/** @implemented */
interface IDivision {
  _id: ObjectId;
  leagueId: ObjectId;              // ref League
  name: string;                    // max 80
  order: number;                   // display sort, default 0
  handicapRules?: PoolHandicapRules; // @implemented — L2.2 storage only
  /** @implemented — L8.2 individual entrants; array order = bracket seed */
  playerIds?: ObjectId[];          // ref Player[]
  createdAt: Date;
  updatedAt: Date;
}

/** @implemented — L2.2 storage; standings math @planned v1.1 */
interface PoolHandicapRules {
  system: 'apa' | 'vnea' | 'none';
  skillLevelRange?: [number, number];
  handicapPerSkillLevel?: number;
}
```

**Indexes (implemented):** `{ leagueId, order }`

> **@planned v1.1:** `PoolStandingsEngine` will apply `handicapRules` when computing points.

---

## Team

```typescript
/** @implemented */
interface ITeam {
  _id: ObjectId;
  leagueId: ObjectId;
  divisionId: ObjectId;
  name: string;                    // max 120
  captainPlayerId?: ObjectId;      // ref Player
  playerIds: ObjectId[];           // ref Player[]
  createdAt: Date;
  updatedAt: Date;
}

/** @planned — Phase 4 multi-venue */
interface ITeamPlanned {
  homeEstablishment?: string;      // establishment slug
  color?: string;                  // jersey / display
}
```

**Indexes (implemented):** `{ leagueId, divisionId, name }`

---

## Registration

Self-service signup records (L10.1 model; public submit in L10.3/L10.4).

```typescript
/** @implemented — L10.1 */
type RegistrationStatus =
  | 'draft'
  | 'pending_payment'
  | 'pending_approval'
  | 'approved'
  | 'waitlisted'
  | 'rejected'
  | 'cancelled';

/** @implemented — L10.1 */
interface IRegistration {
  _id: ObjectId;
  leagueId: ObjectId;              // ref League
  divisionId?: ObjectId;           // ref Division
  entrantType: 'team' | 'player';
  status: RegistrationStatus;      // default 'draft'
  submittedByPlayerId: ObjectId;   // ref Player — captain or self
  teamId?: ObjectId;               // set on approve (team flow)
  playerIds?: ObjectId[];          // roster snapshot at submit
  teamName?: string;
  waiverAccepted: boolean;
  waiverTextSnapshot: string;
  paymentId?: ObjectId;            // @planned L11
  reviewedBy?: ObjectId;           // ref User
  reviewedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes (implemented):** `{ leagueId, status }`, `{ submittedByPlayerId }`

---

## Player

Venue-scoped identity; same person can appear in pool and darts.

```typescript
/** @implemented */
interface IPlayer {
  _id: ObjectId;
  name: string;                    // max 120
  email?: string;                  // dedup key per establishment
  phone?: string;
  auth0Sub?: string;               // set when captain account created
  establishmentSlug: string;       // default 'default'
  createdAt: Date;
  updatedAt: Date;
}

/** @planned — Phase 4 self-service */
interface IPlayerPlanned {
  dateOfBirth?: Date;
  emergencyContact?: string;
  registeredAt?: Date;
}
```

**Indexes (implemented):** `{ establishmentSlug, email }` unique partial; `{ auth0Sub }` sparse unique

---

## Match (base)

All sports share scheduling and result fields. Sport-specific data uses Mongoose discriminators on `sport`.

```typescript
/** @implemented */
interface IMatchResult {
  winnerTeamId?: ObjectId;
  /** @implemented — L8.3 player-entrant matches */
  winnerPlayerId?: ObjectId;
  homeScore: number;               // default 0
  awayScore: number;               // default 0
  forfeitBy?: 'home' | 'away';
}

/** @implemented */
interface IMatch {
  _id: ObjectId;
  sport: Sport;                    // discriminator key
  leagueId: ObjectId;
  divisionId: ObjectId;
  /** Team-entrant leagues — XOR with homePlayerId/awayPlayerId */
  homeTeamId?: ObjectId;
  awayTeamId?: ObjectId;
  /** @implemented — L8.3 player-entrant leagues */
  homePlayerId?: ObjectId;
  awayPlayerId?: ObjectId;
  scheduledAt: Date;
  roundNumber: number;             // 1-indexed; round-robin week
  venue?: string;
  status: MatchStatus;             // default 'scheduled'
  result?: IMatchResult;
  createdAt: Date;
  updatedAt: Date;
}
```

### Sport discriminators

```typescript
/** @implemented — pool */
interface IPoolMatch extends IMatch {
  sport: 'pool';
  /** @implemented — L2.1 */
  poolFormat?: '8_ball' | '9_ball';
  /** @implemented — L8.7 player-entrant 9-ball tournaments (default 5) */
  raceTo?: number;
}

/** @planned — Phase 1.1 */
interface IPoolMatchPlanned {
  homeHandicap?: number;
  awayHandicap?: number;
}

/** @implemented — Phase 2 (L3.1) */
interface IDartsMatch extends IMatch {
  sport: 'darts';
  dartsFormat?: '501' | '301' | 'cricket';
  legsToWin?: number;
  isDoubles?: boolean;
}

/** @implemented — Phase 3 (L4.1) */
interface IVolleyballMatch extends IMatch {
  sport: 'volleyball';
  setsToWin?: 2 | 3;
}

/** @planned — per-set detail on scoresheet */
interface IVolleyballMatchPlanned {
  setScores?: Array<{ home: number; away: number }>;
}
```

**Indexes (implemented):** `{ leagueId, scheduledAt }`, `{ divisionId, status }`, `{ divisionId, roundNumber }`

---

## Scoresheet

Dual-entry captain workflow. One document per side per match.

```typescript
/** @implemented */
interface IScoresheet {
  _id: ObjectId;
  matchId: ObjectId;
  submittedBy: ScoresheetSide;
  submittedByPlayerId: ObjectId;
  status: ScoresheetStatus;        // default 'draft'
  payload: Record<string, unknown>; // sport-specific score entry
  reviewedBy?: ObjectId;           // ref User (league admin)
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** @planned — typed pool payload */
interface PoolScoresheetPayload {
  homeRaceWins: number;
  awayRaceWins: number;
  playerResults?: Array<{
    homePlayerId: ObjectId;
    awayPlayerId: ObjectId;
    winnerSide: ScoresheetSide;
  }>;
}

/** @planned — dispute metadata */
interface IScoresheetPlanned {
  disputeNote?: string;
  submittedAt?: Date;
}
```

**Indexes (implemented):** `{ matchId, submittedBy }` unique

---

## StandingsSnapshot

Materialized standings — recomputed when a match moves to `final`.

```typescript
/** @implemented — season leagues use teamId; tournaments use playerId */
interface IStandingsEntry {
  teamId?: ObjectId;
  /** @implemented — L8.6 player-entrant placement standings */
  playerId?: ObjectId;
  rank: number;
  /** @implemented — L8.6 bracket finish (1 = champion) */
  placement?: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  gamesPlayed: number;
}

/** @implemented */
interface IStandingsSnapshot {
  _id: ObjectId;
  leagueId: ObjectId;
  divisionId: ObjectId;
  computedAt: Date;
  entries: IStandingsEntry[];
  createdAt: Date;
  updatedAt: Date;
}

/** @implemented — API/view layer only (not stored on snapshot) */
type StandingsType = 'season' | 'placement';

/** @planned — pool tie-breakers */
interface IStandingsEntryPlanned {
  winPercentage?: number;
  headToHead?: Record<string, number>; // teamId → wins vs that team
  pointsFor?: number;
  pointsAgainst?: number;
}
```

**Indexes (implemented):** `{ leagueId, divisionId, computedAt }`

---

## User extension (auth)

```typescript
/** @implemented */
interface IUser {
  _id: ObjectId;
  name: string;
  email: string;
  auth0Sub: string;
  role: 'manager' | 'staff';
  createdAt: Date;
}

/** @implemented — partial on IUser */
interface IUserLeagues {
  role: 'manager' | 'staff' | 'league_admin' | 'captain';
  playerId?: ObjectId;             // captain → Player link
}
```

---

## API payload types (schedule generation)

```typescript
/** @implemented — POST /api/admin/leagues/:leagueId/schedule/generate
 *  Supports league.format: round_robin | ladder | bracket
 */
interface GenerateScheduleRequest {
  divisionId: string;
  startDate: string;               // ISO date of round 1 (local date)
  roundIntervalDays?: number;      // default 7
  matchTime?: string;              // "HH:mm" 24h, default "19:00"
  replaceExisting?: boolean;       // delete scheduled matches for division first
}

interface GenerateScheduleResponse {
  matchesCreated: number;
  rounds: number;
  divisionId: string;
}

/** @implemented — GET /api/admin/leagues/:leagueId/matches enriched list item */
interface MatchListItem extends IMatch {
  _id: string;
  divisionName: string;
  homeTeamName: string;
  awayTeamName: string;
  scheduledAt: string;             // ISO
}
```

### People directory (L9.1)

No new Mongoose models — aggregates `Player`, `Team`, `Division`, `League`, and `User`.

```typescript
/** @implemented — GET /api/admin/leagues/people */
type PeopleLoginStatus = 'linked' | 'invited' | 'unlinked';
type PeopleRole = 'captain' | 'player' | 'none';

interface PeopleDirectoryQuery {
  q?: string;                      // name or email search
  role?: 'captain' | 'player' | 'unlinked';
  loginStatus?: PeopleLoginStatus;
  sport?: Sport;
  page?: number;                   // default 1
  limit?: number;                  // default 25, max 100
}

interface PeopleTeamEntry {
  teamId: string;
  teamName: string;
  leagueId: string;
  leagueName: string;
  sport: Sport;
  isCaptain: boolean;
}

interface PeopleDirectoryEntry {
  _id: string;                     // Player id
  name: string;
  email?: string;
  auth0Sub?: string;
  establishmentSlug: string;
  role: PeopleRole;
  teams: PeopleTeamEntry[];
  loginStatus: PeopleLoginStatus;
  lastInvitedAt?: string;          // ISO — from Player.captainInvitedAt
}

interface PeopleDirectoryResponse {
  data: PeopleDirectoryEntry[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
```

**Login status rules:** `linked` = `Player.auth0Sub` or captain/player `User` exists · `invited` = `PendingInvite` or `captainInvitedAt` set · else `unlinked`.

```typescript
/** @implemented — L9.2 pending login invites before Auth0 account exists */
interface IPendingInvite {
  _id: ObjectId;
  playerId: ObjectId;
  email: string;
  role: 'captain' | 'player';
  invitedBy?: ObjectId;
  invitedAt: Date;
}
```

**Indexes:** `{ playerId, role }` unique · `{ email, role }`

---

## Entity relationships

```
SiteSettings.sportsEnabled
League (1) ──< Division (N) ──< Team (N) ──< playerIds[] → Player
League (1) ──< Match (N) ──< Scoresheet (0–2 per match, home + away)
Division (1) ──< StandingsSnapshot (N, latest wins)
```

---

## Implementation checklist

| Entity | Model file | CRUD routes | Notes |
|--------|------------|-------------|-------|
| League | `League.ts` | ✅ | |
| Division | `Division.ts` | ✅ | |
| Team | `Team.ts` | ✅ | |
| Player | `Player.ts` | ✅ partial | list + create only |
| Match | `Match.ts` | ✅ list + generate | `roundNumber`; formats: round_robin, ladder, bracket |
| Scoresheet | `Scoresheet.ts` | ✅ captain submit + admin resolve | dual-entry workflow |
| StandingsSnapshot | `StandingsSnapshot.ts` | ✅ auto on final + admin recalc | `PoolStandingsEngine` |
| PoolMatch discriminator | `Match.ts` | — | used on pool league create |
| DartsMatch discriminator | `Match.ts` | — | used on darts league schedule generate |
| DartsStandingsEngine | `standings/DartsStandingsEngine.ts` | — | W=2, T=1; match.result = legs won |
| VolleyballMatch discriminator | `Match.ts` | — | schedule generate; default setsToWin: 2 |
| VolleyballStandingsEngine | `standings/VolleyballStandingsEngine.ts` | — | W=2, T=1; match.result = sets won |
| Sport scoresheet router | `services/leagues/scoresheets/` | — | **L1** — refactor from pool-only scoresheet.ts |

**Next build:** [prompts/LEAGUES_BUILD_PROMPTS.md](../prompts/LEAGUES_BUILD_PROMPTS.md)

---

## Related docs

| Document | Purpose |
|----------|---------|
| [LEAGUES.md](../LEAGUES.md) | Product plan and phased rollout |
| [CONTEXT_server_models.md](../contexts/CONTEXT_server_models.md) | General Mongoose conventions |
