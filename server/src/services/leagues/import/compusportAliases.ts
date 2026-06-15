import { normalizeHeader, parseCsv, rowsToRecords } from './parseCsv';

export type CsvImportFormat = 'canonical' | 'compusport';

/**
 * CompuSport Excel export columns (Teams / Players / Leagues Schedule tabs)
 * mapped to Tavern Base canonical import headers.
 *
 * @see docs/leagues/CSV_IMPORT.md
 */
export const COMPUSPORT_TO_CANONICAL: Record<string, string> = {
  // Division
  divnid: 'division',
  divn_id: 'division',
  division_id: 'division',
  division_acronym: 'division',
  divisionid: 'division',
  flight: 'division',

  // Teams
  teamname: 'team',
  team_name: 'team',

  // Players
  playername: 'name',
  player_name: 'name',
  membername: 'name',
  member_name: 'name',
  player: 'name',
  emailaddress: 'email',
  email_address: 'email',
  e_mail: 'email',
  phonenumber: 'phone',
  phone_number: 'phone',
  teamcaptain: 'captain',
  is_team_captain: 'captain',
  captain_flag: 'captain',
  is_captain: 'captain',

  // Schedule
  hometeam: 'home',
  awayteam: 'away',
  home_team_name: 'home',
  away_team_name: 'away',
  team1: 'home',
  team2: 'away',
  matchdate: 'date',
  scheduledate: 'date',
  game_date: 'date',
  scheduled_date: 'date',
  matchtime: 'time',
  starttime: 'time',
  start_time: 'time',
  weeknumber: 'round',
  week_number: 'week',
  week_no: 'round',
  round_no: 'round',
};

/** Headers that strongly indicate a CompuSport export (after normalizeHeader). */
export const COMPUSPORT_SIGNATURE_HEADERS = [
  'divnid',
  'divn_id',
  'certificationid',
  'teamname',
  'playername',
  'hometeam',
  'awayteam',
  'matchdate',
  'emailaddress',
  'teamcaptain',
] as const;

export function mapHeaderToCanonical(header: string): string {
  const normalized = normalizeHeader(header);
  return COMPUSPORT_TO_CANONICAL[normalized] ?? normalized;
}

export function detectImportFormat(headers: string[]): CsvImportFormat {
  const normalized = headers.map((header) => normalizeHeader(header));
  const isCompuSport = normalized.some((header) =>
    (COMPUSPORT_SIGNATURE_HEADERS as readonly string[]).includes(header)
  );

  return isCompuSport ? 'compusport' : 'canonical';
}

export function applyHeaderAliases(rows: string[][]): {
  format: CsvImportFormat;
  rows: string[][];
} {
  if (rows.length === 0) {
    return { format: 'canonical', rows };
  }

  const [headerRow, ...dataRows] = rows;
  const format = detectImportFormat(headerRow);

  if (format === 'canonical') {
    return { format, rows };
  }

  const mappedHeader = headerRow.map((header) => mapHeaderToCanonical(header));

  return {
    format,
    rows: [mappedHeader, ...dataRows],
  };
}

export function prepareCsvRecords(content: string): {
  format: CsvImportFormat;
  records: Array<Record<string, string>>;
} {
  const parsed = parseCsv(content);
  const { format, rows } = applyHeaderAliases(parsed);

  return {
    format,
    records: rowsToRecords(rows),
  };
}
