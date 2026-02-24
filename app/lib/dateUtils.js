import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

/**
 * Accepted backend formats for parsing dates.
 * The backend returns:
 *   - Timestamps: MM-DD-YYYY h:mm AM/PM  (e.g. "02-24-2026 3:30 PM")
 *   - Date-only:  MM-DD-YYYY             (e.g. "02-24-2026")
 * We also accept YYYY-MM-DD (ISO) for flexibility.
 */
const PARSE_FORMATS = [
  'MM-DD-YYYY h:mm A',
  'MM-DD-YYYY',
  'M-D-YYYY h:mm A',
  'M-D-YYYY',
  'YYYY-MM-DD',
  'YYYY-MM-DDTHH:mm:ss.SSSSSSZ',
  'YYYY-MM-DDTHH:mm:ssZ',
]

/**
 * Parse a date string from the backend into a dayjs object.
 * Handles both MM-DD-YYYY and YYYY-MM-DD formats.
 */
export const parseDate = (date) => {
  if (!date) return null
  if (dayjs.isDayjs(date)) return date
  const d = dayjs(date, PARSE_FORMATS)
  return d.isValid() ? d : null
}

/**
 * Format a date for human-readable display.
 *
 * Date-only  → "January 15, 2026"
 * With time  → "January 15, 2026 — 3:30 PM"
 */
export const formatDisplayDate = (date) => {
  if (!date) return '-'
  const d = parseDate(date)
  if (!d || !d.isValid()) return date

  // Check if the original string has a time component
  if (typeof date === 'string' && /\d{1,2}:\d{2}\s*(AM|PM)/i.test(date)) {
    return d.format('MMMM D, YYYY — h:mm A')
  }
  return d.format('MMMM D, YYYY')
}

/**
 * Format a date for human-readable display (date only, no time).
 * → "January 15, 2026"
 */
export const formatDisplayDateOnly = (date) => {
  if (!date) return 'N/A'
  const d = parseDate(date)
  if (!d || !d.isValid()) return date
  return d.format('MMMM D, YYYY')
}

/**
 * Format a dayjs/date for API submission (YYYY-MM-DD).
 * The backend/MySQL expects ISO format for date columns.
 */
export const formatForApi = (date) => {
  if (!date) return null
  const d = dayjs.isDayjs(date) ? date : parseDate(date)
  return d?.isValid() ? d.format('YYYY-MM-DD') : null
}
