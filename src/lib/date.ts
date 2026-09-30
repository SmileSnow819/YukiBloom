/**
 * Unified Date Formatting Utilities
 *
 * Provides consistent date formatting across the site using the configured timezone.
 * All date display should use these utilities to ensure consistent timezone handling.
 */

import { siteTimezone } from '@constants/site-config';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Standard date formats used across the site
 * @internal Used internally by displayDate functions
 */
const DateFormats = {
  /** Full datetime: 2025-01-03 12:30:45 */
  FULL: 'yyyy-MM-dd HH:mm:ss',
  /** Datetime without seconds: 2025-01-03 12:30 */
  DATETIME: 'yyyy-MM-dd HH:mm',
  /** Date only: 2025-01-03 */
  DATE: 'yyyy-MM-dd',
  /** Short date: 25-01-03 */
  SHORT_DATE: 'yy-MM-dd',
  /** Month and day: 01/03 */
  MONTH_DAY: 'MM/dd',
} as const;

/**
 * Format a date using the site's configured timezone
 * @internal Used by displayDate and formatForSeo
 */
function formatDate(date: Date | string, formatStr: string = DateFormats.DATE, timezone: string = siteTimezone): string {
  if (date == null) {
    throw new Error('Date parameter is required and cannot be null or undefined');
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Validate that the date is valid
  if (Number.isNaN(dateObj.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }

  return formatInTimeZone(dateObj, timezone, formatStr);
}

/**
 * Convenience functions for common date display formats
 * All functions use the site's configured timezone
 */
export const displayDate = {
  /** Format as yyyy-MM-dd */
  date: (d: Date | string) => formatDate(d, DateFormats.DATE),

  /** Format as yyyy-MM-dd HH:mm */
  datetime: (d: Date | string) => formatDate(d, DateFormats.DATETIME),

  /** Format as yy-MM-dd */
  shortDate: (d: Date | string) => formatDate(d, DateFormats.SHORT_DATE),

  /** Format as MM/dd */
  monthDay: (d: Date | string) => formatDate(d, DateFormats.MONTH_DAY),

  /** Format as yyyy-MM-dd HH:mm:ss */
  full: (d: Date | string) => formatDate(d, DateFormats.FULL),
} as const;

/**
 * Format date for SEO/Schema.org (ISO date format)
 *
 * @param date - Date object or date string
 * @returns Date in yyyy-MM-dd format for SEO
 */
export function formatForSeo(date: Date | string): string {
  return formatDate(date, DateFormats.DATE);
}
