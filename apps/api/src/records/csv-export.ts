type CsvValue = string | number | boolean | null | undefined;

const FORMULA_PREFIXES = new Set(['=', '+', '-', '@', '＝', '＋', '－', '＠']);

function hasFormulaPrefix(value: string): boolean {
  const firstCode = value.charCodeAt(0);
  if (
    firstCode === 0 ||
    firstCode === 9 ||
    firstCode === 10 ||
    firstCode === 13
  ) {
    return true;
  }

  let index = 0;
  while (index < value.length && value.charCodeAt(index) <= 32) {
    index += 1;
  }

  return FORMULA_PREFIXES.has(value[index] ?? '');
}

export function csvCell(value: CsvValue): string {
  const text = value === null || value === undefined ? '' : String(value);
  const safe = hasFormulaPrefix(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function createCsv(rows: readonly (readonly CsvValue[])[]): string {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}
