/**
 * Display formatting for temporal values in list views.
 * @param {*} value raw value from PostgREST
 * @param {'date'|'datetime'} mode
 * @returns {string}
 */
export function formatTemporal(value, mode = 'datetime') {
  const s = String(value);
  // Plain dates pass through untouched: parsing '2026-07-13' as a Date
  // means UTC midnight, which can shift a day in western timezones.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (mode === 'date') return date;
  return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
