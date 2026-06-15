/**
 * Minimal CSV parser for league imports.
 * Handles quoted fields and comma separators. Skips blank lines and # comments.
 */
export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    rows.push(parseCsvLine(trimmed));
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  fields.push(current.trim());
  return fields;
}

export function rowsToRecords(rows: string[][]): Array<Record<string, string>> {
  if (rows.length === 0) return [];

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((header) => normalizeHeader(header));

  return dataRows
    .filter((row) => row.some((cell) => cell.trim() !== ''))
    .map((row) => {
      const record: Record<string, string> = {};

      headers.forEach((header, index) => {
        if (header) {
          record[header] = row[index]?.trim() ?? '';
        }
      });

      return record;
    });
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export { normalizeHeader };

export function pickField(record: Record<string, string>, aliases: string[]): string {
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    const value = record[key];

    if (value) {
      return value;
    }
  }

  return '';
}

export function parseDateTime(dateStr: string, timeStr?: string): Date {
  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  if (timeStr) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());

    if (match) {
      date.setHours(Number(match[1]), Number(match[2]), 0, 0);
      return date;
    }
  }

  date.setHours(19, 0, 0, 0);
  return date;
}
