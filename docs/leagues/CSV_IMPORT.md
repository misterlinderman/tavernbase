# League CSV Import

Canonical CSV format for migrating data from CompuSport, MusicService, or spreadsheets into Tavern Base.

**Admin endpoint:** `POST /api/admin/leagues/:leagueId/import`

```json
{
  "type": "teams",
  "csv": "division,team\nA Flight,Shark Attack",
  "defaultDivisionName": "Division 1"
}
```

Import **teams first**, then **players**, then **schedule**. Players and schedule reference division/team names case-insensitively.

The importer **auto-detects CompuSport exports** and maps column headers to the canonical format below. Canonical CSV (spreadsheets you write yourself) still works unchanged.

**Verify alias mapping:** `npx ts-node server/src/scripts/verifyCompusportImport.ts`

---

## Teams (`type: "teams"`)

Creates divisions and teams. Skips duplicates.

### Canonical columns

| Column | Required | Aliases (CompuSport / common) |
|--------|----------|-------------------------------|
| `team` | Yes | `team_name`, `name`, `Team Name`, **`TeamName`** |
| `division` | No | `division_name`, `flight`, `Division`, **`DivnID`**, `Divn Id` — defaults to `defaultDivisionName` or `Division 1` |

### Canonical example

```csv
division,team
A Flight,Shark Attack
A Flight,Cue Masters
B Flight,Rack Attack
```

### CompuSport Teams tab example

Export the **Teams** sheet as CSV (or copy columns). `CertificationID` is ignored — team **names** are used for matching.

```csv
DivnID,TeamName,CertificationID
A Flight,Shark Attack,1001
A Flight,Cue Masters,1002
B Flight,Rack Attack,2001
```

Fixture: `server/src/__fixtures__/compusport/teams.compusport.csv`

---

## Players (`type: "players"`)

Creates players and optionally assigns them to teams. Set captain with `captain` column.

### Canonical columns

| Column | Required | Aliases |
|--------|----------|---------|
| `name` | Yes | `player`, `player_name`, `Player Name`, **`PlayerName`**, `MemberName` |
| `email` | No | `e_mail`, `Email`, **`EmailAddress`** |
| `phone` | No | `Phone`, **`PhoneNumber`** |
| `team` | No | `team_name`, `Team`, **`TeamName`** |
| `division` | No | `division_name`, `flight`, `Division`, **`DivnID`** |
| `captain` | No | `is_captain`, `Captain`, **`TeamCaptain`** — `yes`, `true`, `1`, `captain` |

### Canonical example

```csv
name,email,team,division,captain
John Smith,john@example.com,Shark Attack,A Flight,yes
Jane Doe,jane@example.com,Shark Attack,A Flight,
```

### CompuSport Players tab example

```csv
DivnID,TeamName,PlayerName,EmailAddress,TeamCaptain
A Flight,Shark Attack,Alex Player,player.alex@example.com,yes
A Flight,Shark Attack,Jordan Player,,no
A Flight,Cue Masters,Taylor Player,player.taylor@example.com,yes
```

Fixture: `server/src/__fixtures__/compusport/players.compusport.csv`

---

## Schedule (`type: "schedule"`)

Creates scheduled matches. Teams and divisions must already exist.

### Canonical columns

| Column | Required | Aliases |
|--------|----------|---------|
| `division` | Yes | `division_name`, `flight`, `Division`, **`DivnID`** |
| `home` | Yes | `home_team`, `Home Team`, **`HomeTeam`** |
| `away` | Yes | `away_team`, `Away Team`, **`AwayTeam`** |
| `date` | Yes | `match_date`, `scheduled_date`, `Date`, **`MatchDate`**, `ScheduleDate` |
| `time` | No | `match_time`, `Time`, **`MatchTime`**, `StartTime` — `HH:mm` (defaults 19:00) |
| `round` | No | `round_number`, `week`, `Round`, **`WeekNumber`**, `WeekNo` |

### Canonical example

```csv
division,round,date,time,home,away
A Flight,1,2026-03-10,19:00,Shark Attack,Cue Masters
A Flight,1,2026-03-10,19:00,Rack Attack,Break Room
```

### CompuSport Leagues Schedule tab example

Use **team names** in `HomeTeam` / `AwayTeam` columns (not `CertificationID` alone). Names must match imported teams.

```csv
DivnID,MatchDate,MatchTime,HomeTeam,AwayTeam,WeekNumber
A Flight,2026-03-10,19:00,Shark Attack,Cue Masters,1
A Flight,2026-03-10,19:30,Rack Attack,Break Room,1
B Flight,2026-03-17,19:00,Shark Attack,Rack Attack,2
```

Fixture: `server/src/__fixtures__/compusport/schedule.compusport.csv`

---

## Results (`type: "results"`)

Backfills **historical finalized matches** and recalculates standings. Teams and divisions must already exist. Does **not** create scoresheets or trigger the captain dispute workflow — matches are written directly as `final` (or `forfeit` / `cancelled`).

Skips rows when a matching match is already `final` (same division, home team, away team, and scheduled date/time). Updates non-final matches (e.g. imported schedule rows) to the imported result.

### Canonical columns

| Column | Required | Aliases |
|--------|----------|---------|
| `divisionName` | Yes | `division`, `division_name`, `flight`, `Division`, `DivnID` |
| `homeTeamName` | Yes | `home`, `home_team`, `Home Team`, `HomeTeam` |
| `awayTeamName` | Yes | `away`, `away_team`, `Away Team`, `AwayTeam` |
| `scheduledAt` | Yes | `date`, `match_date`, `scheduled_date`, `Date`, `MatchDate` |
| `homeScore` | Yes | `home_score`, `HomeScore` |
| `awayScore` | Yes | `away_score`, `AwayScore` |
| `status` | No | `match_status`, `Status` — `final` (default), `forfeit`, or `cancelled` |
| `time` | No | `match_time`, `Time`, `MatchTime` — `HH:mm` when date has no time |
| `round` | No | `round_number`, `week`, `Round` |

### Canonical example

```csv
divisionName,homeTeamName,awayTeamName,scheduledAt,homeScore,awayScore,status
A Flight,Shark Attack,Cue Masters,2026-03-10,5,3,final
A Flight,Rack Attack,Break Room,2026-03-17,4,4,final
B Flight,Shark Attack,Rack Attack,2026-03-24,7,2,final
```

Standings are **recomputed automatically** after a successful results import.

---

## CompuSport migration workflow

CompuSport does not expose a public export API. Typical migration path:

1. From CompuSport: **Menu → General → Files → Excel Spreadsheet** (Teams, Players, Leagues Schedule tabs).
2. Save each tab as CSV (or copy columns into the admin import textarea).
3. Import in order: **teams → players → schedule** on `/admin/leagues/:id`.
4. Optionally import **Match results (historical)** to backfill past scores and standings.
5. The admin UI shows **Detected format: CompuSport** when signature columns (`DivnID`, `TeamName`, etc.) are present.
6. Link captain Auth0 accounts via **Invite captain** or **Players & captain logins**.

Alias mapping lives in `server/src/services/leagues/import/compusportAliases.ts`. When a pilot bar provides a real export with different column names, add them to `COMPUSPORT_TO_CANONICAL` and extend the fixtures.

**Known limitation:** Schedule rows that reference teams by `CertificationID` only (no team name) are not supported yet — use name columns or pre-map in a spreadsheet.

---

## Response shape

```json
{
  "data": {
    "type": "teams",
    "format": "compusport",
    "created": 8,
    "updated": 0,
    "skipped": 1,
    "errors": ["Row 5: missing team name"]
  }
}
```

| Field | Values |
|-------|--------|
| `format` | `canonical` \| `compusport` — detected from header row |

Lines starting with `#` and blank lines are ignored.

---

## Entrants (`type: "entrants"`) — @planned

For leagues with `entrantType: 'player'`, use the admin **Division entrants** UI (L8.2). Planned CSV columns:

| Column | Required | Notes |
|--------|----------|-------|
| `division` | yes | Division name (created if missing) |
| `player_name` | yes | Venue player name |
| `email` | no | Used for player portal login |
| `seed` | no | Bracket seed order (defaults to row order) |

Import order: divisions (via `teams` type or manual) → `entrants` rows. Not implemented in v1 — add via dashboard.
