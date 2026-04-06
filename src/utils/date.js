/**
 * Date and time utilities
 */

// Cache Intl.DateTimeFormat instances for performance
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric'
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
});

const localDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

const localDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric'
});

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  const d = new Date(date);
  return dateFormatter.format(d);
}

/**
 * Format time to local time string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted time string
 */
export function formatTime(date) {
  const d = new Date(date);
  return timeFormatter.format(d);
}

/**
 * Format full date and time
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date and time string
 */
export function formatDateTime(date) {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

/**
 * Format date to local date string (equivalent to toLocaleDateString with long format)
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted local date string
 */
export function formatDateLocal(date) {
  return localDateFormatter.format(new Date(date));
}

/**
 * Format date to local date/time string (equivalent to toLocaleString)
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted local date-time string
 */
export function formatDateTimeLocal(date) {
  return localDateTimeFormatter.format(new Date(date));
}

/**
 * Get relative time (e.g., "2 hours ago", "in 5 minutes")
 * @param {string|Date} date - Date to compare
 * @returns {string} Relative time string
 */
export function getRelativeTime(date) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = d - now;
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (diffMins < -60) {
    if (diffHours < -24) {
      return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`;
    }
    return `${Math.abs(diffHours)} hour${Math.abs(diffHours) !== 1 ? 's' : ''} ago`;
  } else if (diffMins < 0) {
    return `${Math.abs(diffMins)} minute${Math.abs(diffMins) !== 1 ? 's' : ''} ago`;
  } else if (diffMins === 0) {
    return 'now';
  } else if (diffMins < 60) {
    return `in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  } else {
    return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }
}

/**
 * Check if date is today
 * @param {string|Date} date - Date to check
 * @returns {boolean} True if date is today
 */
export function isToday(date) {
  const d = new Date(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

/**
 * Check if match is live (within game time window)
 * @param {string|Date} date - Match start time
 * @param {number} durationHours - Expected match duration in hours (default 3)
 * @returns {boolean} True if match is likely live
 */
export function isLive(date, durationHours = 3) {
  const d = new Date(date);
  const now = new Date();
  const endTime = new Date(d.getTime() + durationHours * 3600000);
  return now >= d && now <= endTime;
}

/**
 * Get date in YYYY-MM-DD format for API calls
 * @param {Date} date - Date object (default today)
 * @returns {string} Date in YYYY-MM-DD format
 */
export function toAPIDate(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get date range for upcoming days
 * @param {number} days - Number of days to include
 * @returns {string[]} Array of dates in YYYY-MM-DD format
 */
export function getUpcomingDates(days = 7) {
  const dates = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(toAPIDate(date));
  }
  
  return dates;
}
