/**
 * Time and Date utilities anchored strictly to Africa/Cairo timezone
 */

export const CAIRO_TIMEZONE = 'Africa/Cairo';

/**
 * Returns current date string in Cairo: YYYY-MM-DD
 */
export function getCairoTodayDate(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Returns current time string in Cairo: HH:mm:ss
 */
export function getCairoCurrentTime(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: CAIRO_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return formatter.format(date);
}

/**
 * Normalizes user-inputted time string (e.g. '09:30' or '9:30') to 'HH:mm:ss'
 */
export function normalizeTimeString(timeStr?: string | null): string | null {
  if (!timeStr || !timeStr.trim()) return null;
  const clean = timeStr.trim();
  const parts = clean.split(':');
  if (parts.length < 2) return clean;
  const hh = parts[0].padStart(2, '0');
  const mm = parts[1].padStart(2, '0');
  const ss = parts[2] ? parts[2].padStart(2, '0') : '00';
  return `${hh}:${mm}:${ss}`;
}

/**
 * Returns day of week in Cairo (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
export function getCairoDayOfWeek(date: Date = new Date()): number {
  const str = new Intl.DateTimeFormat('en-US', {
    timeZone: CAIRO_TIMEZONE,
    weekday: 'short',
  }).format(date);
  
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[str] ?? date.getDay();
}

/**
 * Format Arabic date string for Cairo
 */
export function formatCairoArabicDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: CAIRO_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Format Arabic time string (e.g. 09:30 ص or 02:15 م)
 */
export function formatArabicTime(timeStr?: string | null): string {
  if (!timeStr) return '-';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const mins = parts[1];
  const ampm = hours >= 12 ? 'م' : 'ص';
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;
  return `${hours}:${mins} ${ampm}`;
}

export const ARABIC_DAYS_NAMES = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];
