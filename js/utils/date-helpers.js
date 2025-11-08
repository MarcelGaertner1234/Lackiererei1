/**
 * @fileoverview Date and Time Utilities
 *
 * Zentrale Datums- und Zeitfunktionen.
 * Extrahiert aus: mitarbeiter-dienstplan.html, dienstplan.html, kalender.html
 *
 * @version 3.2.0
 * @created 2025-11-09
 * @author Claude Code (Quick Win #2: Utility Extraction)
 */

/// <reference path="../types.js" />

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Format date to German locale string
 * @param {Date|string|number} date - Date to format
 * @param {string} [format='DD.MM.YYYY'] - Format string
 * @returns {string} Formatted date string
 *
 * Supported formats:
 * - 'DD.MM.YYYY' → 08.11.2025
 * - 'DD.MM.YY' → 08.11.25
 * - 'YYYY-MM-DD' → 2025-11-08 (ISO)
 * - 'DD. MMM YYYY' → 08. Nov 2025
 * - 'DD. MMMM YYYY' → 08. November 2025
 * - 'weekday' → Freitag
 * - 'short' → Fr, 08.11.2025
 */
export function formatDate(date, format = 'DD.MM.YYYY') {
    const d = new Date(date);

    if (isNaN(d.getTime())) {
        console.error('Invalid date:', date);
        return 'Ungültiges Datum';
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const shortYear = String(year).slice(-2);

    const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    const monthNamesShort = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
                             'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const weekdayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const weekdayNamesShort = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

    switch (format) {
        case 'DD.MM.YYYY':
            return `${day}.${month}.${year}`;
        case 'DD.MM.YY':
            return `${day}.${month}.${shortYear}`;
        case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`;
        case 'DD. MMM YYYY':
            return `${day}. ${monthNamesShort[d.getMonth()]} ${year}`;
        case 'DD. MMMM YYYY':
            return `${day}. ${monthNames[d.getMonth()]} ${year}`;
        case 'weekday':
            return weekdayNames[d.getDay()];
        case 'short':
            return `${weekdayNamesShort[d.getDay()]}, ${day}.${month}.${year}`;
        default:
            return d.toLocaleDateString('de-DE');
    }
}

/**
 * Format time to HH:MM string
 * @param {Date|string|number} time - Time to format
 * @returns {string} Formatted time string (HH:MM)
 */
export function formatTime(time) {
    const t = new Date(time);

    if (isNaN(t.getTime())) {
        console.error('Invalid time:', time);
        return '00:00';
    }

    const hours = String(t.getHours()).padStart(2, '0');
    const minutes = String(t.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
}

/**
 * Format datetime to German locale string
 * @param {Date|string|number} datetime - Datetime to format
 * @returns {string} Formatted datetime string (DD.MM.YYYY HH:MM)
 */
export function formatDateTime(datetime) {
    const dt = new Date(datetime);

    if (isNaN(dt.getTime())) {
        console.error('Invalid datetime:', datetime);
        return 'Ungültiges Datum';
    }

    return `${formatDate(dt)} ${formatTime(dt)}`;
}

// ============================================================================
// WORK HOURS CALCULATION
// ============================================================================

/**
 * Calculate work hours between start and end time, excluding breaks
 * @param {Date|string|number} start - Start time
 * @param {Date|string|number} end - End time
 * @param {number} [breakMinutes=0] - Break duration in minutes
 * @returns {number} Work hours (decimal)
 */
export function calculateWorkHours(start, end, breakMinutes = 0) {
    const startTime = new Date(start);
    const endTime = new Date(end);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        console.error('Invalid times:', { start, end });
        return 0;
    }

    if (endTime <= startTime) {
        console.error('End time must be after start time:', { start, end });
        return 0;
    }

    const diffMs = endTime - startTime;
    const diffMinutes = diffMs / (1000 * 60);
    const workMinutes = diffMinutes - breakMinutes;

    return Math.max(0, workMinutes / 60);
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 * @param {string} timeStr - Time string (HH:MM)
 * @returns {number} Minutes since midnight
 */
export function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);

    if (isNaN(hours) || isNaN(minutes)) {
        console.error('Invalid time string:', timeStr);
        return 0;
    }

    return hours * 60 + minutes;
}

/**
 * Convert minutes to time string (HH:MM)
 * @param {number} minutes - Minutes since midnight
 * @returns {string} Time string (HH:MM)
 */
export function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// ============================================================================
// CALENDAR HELPERS
// ============================================================================

/**
 * Get ISO week number for a date
 * @param {Date|string|number} date - Date
 * @returns {number} ISO week number (1-53)
 */
export function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

/**
 * Get first day of week (Monday)
 * @param {Date|string|number} date - Any date in the week
 * @returns {Date} First day of week (Monday)
 */
export function getFirstDayOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
}

/**
 * Get last day of week (Sunday)
 * @param {Date|string|number} date - Any date in the week
 * @returns {Date} Last day of week (Sunday)
 */
export function getLastDayOfWeek(date) {
    const firstDay = getFirstDayOfWeek(date);
    return new Date(firstDay.getTime() + 6 * 24 * 60 * 60 * 1000);
}

/**
 * Get all days in a week
 * @param {Date|string|number} date - Any date in the week
 * @returns {Date[]} Array of 7 dates (Monday to Sunday)
 */
export function getWeekDays(date) {
    const firstDay = getFirstDayOfWeek(date);
    const days = [];

    for (let i = 0; i < 7; i++) {
        days.push(new Date(firstDay.getTime() + i * 24 * 60 * 60 * 1000));
    }

    return days;
}

// ============================================================================
// BUSINESS DAY CALCULATIONS
// ============================================================================

/**
 * Check if a date is a workday (Monday to Friday)
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if workday
 */
export function isWorkday(date) {
    const d = new Date(date);
    const day = d.getDay();
    return day >= 1 && day <= 5; // Monday = 1, Friday = 5
}

/**
 * Calculate number of business days between two dates (excluding weekends)
 * @param {Date|string|number} startDate - Start date
 * @param {Date|string|number} endDate - End date
 * @returns {number} Number of business days
 */
export function calculateBusinessDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error('Invalid dates:', { startDate, endDate });
        return 0;
    }

    if (end < start) {
        console.error('End date must be after start date');
        return 0;
    }

    let count = 0;
    const current = new Date(start);

    while (current <= end) {
        if (isWorkday(current)) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }

    return count;
}

/**
 * Add business days to a date (skip weekends)
 * @param {Date|string|number} date - Start date
 * @param {number} days - Number of business days to add
 * @returns {Date} Resulting date
 */
export function addBusinessDays(date, days) {
    const d = new Date(date);
    let count = 0;

    while (count < days) {
        d.setDate(d.getDate() + 1);
        if (isWorkday(d)) {
            count++;
        }
    }

    return d;
}

// ============================================================================
// MONTH HELPERS
// ============================================================================

/**
 * Get first day of month
 * @param {Date|string|number} date - Any date in the month
 * @returns {Date} First day of month
 */
export function getFirstDayOfMonth(date) {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Get last day of month
 * @param {Date|string|number} date - Any date in the month
 * @returns {Date} Last day of month
 */
export function getLastDayOfMonth(date) {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/**
 * Get number of days in month
 * @param {Date|string|number} date - Any date in the month
 * @returns {number} Number of days in month
 */
export function getDaysInMonth(date) {
    const lastDay = getLastDayOfMonth(date);
    return lastDay.getDate();
}

// ============================================================================
// RELATIVE DATE HELPERS
// ============================================================================

/**
 * Check if date is today
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if today
 */
export function isToday(date) {
    const d = new Date(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
}

/**
 * Get relative date string (heute, gestern, morgen, or date)
 * @param {Date|string|number} date - Date
 * @returns {string} Relative date string
 */
export function getRelativeDateString(date) {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) {
        return 'Heute';
    } else if (d.toDateString() === yesterday.toDateString()) {
        return 'Gestern';
    } else if (d.toDateString() === tomorrow.toDateString()) {
        return 'Morgen';
    } else {
        return formatDate(d);
    }
}

// ============================================================================
// EXPORT NOTE
// ============================================================================

console.log('✅ Date/Time Helper Utilities loaded');
