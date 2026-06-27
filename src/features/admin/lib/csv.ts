/**
 * RFC-4180 CSV serializer with an OWASP CSV-injection guard (ADM-06 / D-08).
 *
 * Quote/comma/newline escaping alone is NOT sufficient — a cell whose value starts with
 * `= + - @` (or tab/CR) is treated as a formula by Excel/Sheets and can execute on open.
 * Neutralize the formula lead FIRST (prefix a single quote), THEN apply RFC-4180 quoting
 * for the container. Order matters: the other way lets an attacker break out of the cell.
 * (owasp.org/www-community/attacks/CSV_Injection + RFC 4180)
 */
const FORMULA_LEAD = /^[=+\-@\t\r]/;

export function csvCell(value: string): string {
  let v = value ?? "";
  if (FORMULA_LEAD.test(v)) v = `'${v}`; // 1) neutralize the formula trigger FIRST
  if (/[",\n\r]/.test(v)) v = `"${v.replace(/"/g, '""')}"`; // 2) RFC-4180 escape
  return v;
}

export function toCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const esc = (c: string | number | null | undefined) =>
    csvCell(c == null ? "" : String(c));
  const lines = [
    headers.map(esc).join(","),
    ...rows.map((r) => r.map(esc).join(",")),
  ];
  return lines.join("\r\n") + "\r\n"; // CRLF per RFC 4180
}
