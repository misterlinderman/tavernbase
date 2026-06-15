export type CsvImportFormat = 'canonical' | 'compusport';

const COMPUSPORT_SIGNATURE_HEADERS = new Set([
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
]);

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/** Lightweight client-side preview — mirrors server detectImportFormat. */
export function detectCsvImportFormat(csv: string): CsvImportFormat | null {
  const firstLine = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('#'));

  if (!firstLine) {
    return null;
  }

  const headers = firstLine.split(',').map((header) => normalizeHeader(header));
  const isCompuSport = headers.some((header) => COMPUSPORT_SIGNATURE_HEADERS.has(header));

  return isCompuSport ? 'compusport' : 'canonical';
}

export function formatImportFormatLabel(format: CsvImportFormat): string {
  return format === 'compusport' ? 'CompuSport' : 'Canonical';
}
