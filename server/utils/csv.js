import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

export function parseCsv(content) {
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
  });
}

export function serializeCsv(columns, rows) {
  return stringify(rows, {
    header: true,
    columns,
  });
}