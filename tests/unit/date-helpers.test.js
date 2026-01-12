/**
 * Unit Tests for date-helpers.js
 * Session #15 (2026-01-12)
 *
 * Tests für Date/Time Utility Funktionen
 */

const {
    formatDate,
    formatTime,
    formatDateTime,
    calculateWorkHours,
    timeToMinutes,
    minutesToTime,
    getWeekNumber,
    getFirstDayOfWeek,
    getLastDayOfWeek,
    getWeekDays,
    isWorkday,
    calculateBusinessDays,
    addBusinessDays,
    getFirstDayOfMonth,
    getLastDayOfMonth,
    getDaysInMonth,
    isToday,
    getRelativeDateString
} = require('../../js/utils/date-helpers');

describe('date-helpers.js', () => {
    // ================================================================
    // formatDate()
    // ================================================================

    describe('formatDate()', () => {
        const testDate = new Date(2026, 0, 12); // 12. Januar 2026

        describe('German formats', () => {
            test('formats to DD.MM.YYYY', () => {
                expect(formatDate(testDate, 'DD.MM.YYYY')).toBe('12.01.2026');
            });

            test('formats to DD.MM.YY', () => {
                expect(formatDate(testDate, 'DD.MM.YY')).toBe('12.01.26');
            });

            test('formats to DD. MMM YYYY', () => {
                expect(formatDate(testDate, 'DD. MMM YYYY')).toBe('12. Jan 2026');
            });

            test('formats to DD. MMMM YYYY', () => {
                expect(formatDate(testDate, 'DD. MMMM YYYY')).toBe('12. Januar 2026');
            });
        });

        describe('ISO format', () => {
            test('formats to YYYY-MM-DD', () => {
                expect(formatDate(testDate, 'YYYY-MM-DD')).toBe('2026-01-12');
            });
        });

        describe('Weekday formats', () => {
            test('returns weekday name', () => {
                expect(formatDate(testDate, 'weekday')).toBe('Montag');
            });

            test('returns short format with weekday', () => {
                expect(formatDate(testDate, 'short')).toBe('Mo, 12.01.2026');
            });
        });

        describe('Default format', () => {
            test('uses DD.MM.YYYY as default', () => {
                expect(formatDate(testDate)).toBe('12.01.2026');
            });
        });

        describe('Invalid input', () => {
            test('returns error message for invalid date', () => {
                expect(formatDate('invalid')).toBe('Ungültiges Datum');
            });
        });

        describe('Different input types', () => {
            test('accepts Date object', () => {
                expect(formatDate(new Date(2025, 11, 25))).toBe('25.12.2025');
            });

            test('accepts timestamp', () => {
                expect(formatDate(1735084800000)).toBeDefined(); // 25.12.2024
            });

            test('accepts ISO string', () => {
                expect(formatDate('2025-12-25')).toBe('25.12.2025');
            });
        });
    });

    // ================================================================
    // formatTime()
    // ================================================================

    describe('formatTime()', () => {
        test('formats time to HH:MM', () => {
            const date = new Date(2026, 0, 12, 14, 30);
            expect(formatTime(date)).toBe('14:30');
        });

        test('pads single digits', () => {
            const date = new Date(2026, 0, 12, 8, 5);
            expect(formatTime(date)).toBe('08:05');
        });

        test('handles midnight', () => {
            const date = new Date(2026, 0, 12, 0, 0);
            expect(formatTime(date)).toBe('00:00');
        });

        test('returns 00:00 for invalid input', () => {
            expect(formatTime('invalid')).toBe('00:00');
        });
    });

    // ================================================================
    // formatDateTime()
    // ================================================================

    describe('formatDateTime()', () => {
        test('combines date and time', () => {
            const date = new Date(2026, 0, 12, 14, 30);
            expect(formatDateTime(date)).toBe('12.01.2026 14:30');
        });

        test('returns error for invalid input', () => {
            expect(formatDateTime('invalid')).toBe('Ungültiges Datum');
        });
    });

    // ================================================================
    // calculateWorkHours()
    // ================================================================

    describe('calculateWorkHours()', () => {
        test('calculates hours between times', () => {
            const start = new Date(2026, 0, 12, 8, 0);
            const end = new Date(2026, 0, 12, 16, 30);
            expect(calculateWorkHours(start, end)).toBe(8.5);
        });

        test('subtracts break time', () => {
            const start = new Date(2026, 0, 12, 8, 0);
            const end = new Date(2026, 0, 12, 16, 30);
            expect(calculateWorkHours(start, end, 30)).toBe(8);
        });

        test('returns 0 when end is before start', () => {
            const start = new Date(2026, 0, 12, 16, 0);
            const end = new Date(2026, 0, 12, 8, 0);
            expect(calculateWorkHours(start, end)).toBe(0);
        });

        test('returns 0 for invalid input', () => {
            expect(calculateWorkHours('invalid', 'invalid')).toBe(0);
        });

        test('returns 0 when break exceeds work time', () => {
            const start = new Date(2026, 0, 12, 8, 0);
            const end = new Date(2026, 0, 12, 8, 30);
            expect(calculateWorkHours(start, end, 60)).toBe(0);
        });
    });

    // ================================================================
    // timeToMinutes() and minutesToTime()
    // ================================================================

    describe('timeToMinutes()', () => {
        test('converts HH:MM to minutes', () => {
            expect(timeToMinutes('08:30')).toBe(510);
            expect(timeToMinutes('00:00')).toBe(0);
            expect(timeToMinutes('23:59')).toBe(1439);
        });

        test('converts midday correctly', () => {
            expect(timeToMinutes('12:00')).toBe(720);
        });

        test('returns 0 for invalid input', () => {
            expect(timeToMinutes('invalid')).toBe(0);
        });
    });

    describe('minutesToTime()', () => {
        test('converts minutes to HH:MM', () => {
            expect(minutesToTime(510)).toBe('08:30');
            expect(minutesToTime(0)).toBe('00:00');
            expect(minutesToTime(1439)).toBe('23:59');
        });

        test('converts midday correctly', () => {
            expect(minutesToTime(720)).toBe('12:00');
        });

        test('pads single digits', () => {
            expect(minutesToTime(65)).toBe('01:05');
        });
    });

    // ================================================================
    // getWeekNumber()
    // ================================================================

    describe('getWeekNumber()', () => {
        test('returns correct ISO week number', () => {
            // 12. Januar 2026 ist KW 3
            expect(getWeekNumber(new Date(2026, 0, 12))).toBe(3);
        });

        test('handles year boundary (first week)', () => {
            // 1. Januar 2026 ist ein Donnerstag - gehört zu KW 1
            expect(getWeekNumber(new Date(2026, 0, 1))).toBe(1);
        });

        test('handles last week of year', () => {
            // 31. Dezember 2025 ist ein Mittwoch - gehört zu KW 1 von 2026
            const week = getWeekNumber(new Date(2025, 11, 31));
            expect(week).toBeGreaterThanOrEqual(1);
        });
    });

    // ================================================================
    // getFirstDayOfWeek() and getLastDayOfWeek()
    // ================================================================

    describe('getFirstDayOfWeek()', () => {
        test('returns Monday for any day in week', () => {
            // 12. Januar 2026 ist Montag
            const monday = getFirstDayOfWeek(new Date(2026, 0, 12));
            expect(monday.getDay()).toBe(1); // Monday
            expect(monday.getDate()).toBe(12);
        });

        test('returns previous Monday for mid-week', () => {
            // 14. Januar 2026 ist Mittwoch
            const monday = getFirstDayOfWeek(new Date(2026, 0, 14));
            expect(monday.getDate()).toBe(12);
        });

        test('returns correct Monday for Sunday', () => {
            // 18. Januar 2026 ist Sonntag
            const monday = getFirstDayOfWeek(new Date(2026, 0, 18));
            expect(monday.getDate()).toBe(12);
        });
    });

    describe('getLastDayOfWeek()', () => {
        test('returns Sunday', () => {
            const sunday = getLastDayOfWeek(new Date(2026, 0, 12));
            expect(sunday.getDay()).toBe(0); // Sunday
        });
    });

    // ================================================================
    // getWeekDays()
    // ================================================================

    describe('getWeekDays()', () => {
        test('returns 7 days', () => {
            const days = getWeekDays(new Date(2026, 0, 12));
            expect(days).toHaveLength(7);
        });

        test('starts with Monday', () => {
            const days = getWeekDays(new Date(2026, 0, 12));
            expect(days[0].getDay()).toBe(1); // Monday
        });

        test('ends with Sunday', () => {
            const days = getWeekDays(new Date(2026, 0, 12));
            expect(days[6].getDay()).toBe(0); // Sunday
        });
    });

    // ================================================================
    // isWorkday()
    // ================================================================

    describe('isWorkday()', () => {
        test('Monday is workday', () => {
            expect(isWorkday(new Date(2026, 0, 12))).toBe(true);
        });

        test('Friday is workday', () => {
            expect(isWorkday(new Date(2026, 0, 16))).toBe(true);
        });

        test('Saturday is not workday', () => {
            expect(isWorkday(new Date(2026, 0, 10))).toBe(false);
        });

        test('Sunday is not workday', () => {
            expect(isWorkday(new Date(2026, 0, 11))).toBe(false);
        });
    });

    // ================================================================
    // calculateBusinessDays()
    // ================================================================

    describe('calculateBusinessDays()', () => {
        test('counts business days in a week', () => {
            // Mo 12.01 bis Fr 16.01 = 5 Tage
            const start = new Date(2026, 0, 12);
            const end = new Date(2026, 0, 16);
            expect(calculateBusinessDays(start, end)).toBe(5);
        });

        test('counts business days across weekend', () => {
            // Mo 12.01 bis Mo 19.01 = 6 Tage (ohne Sa/So)
            const start = new Date(2026, 0, 12);
            const end = new Date(2026, 0, 19);
            expect(calculateBusinessDays(start, end)).toBe(6);
        });

        test('returns 0 for reversed dates', () => {
            const start = new Date(2026, 0, 19);
            const end = new Date(2026, 0, 12);
            expect(calculateBusinessDays(start, end)).toBe(0);
        });

        test('returns 1 for same day (if workday)', () => {
            const day = new Date(2026, 0, 12); // Monday
            expect(calculateBusinessDays(day, day)).toBe(1);
        });
    });

    // ================================================================
    // addBusinessDays()
    // ================================================================

    describe('addBusinessDays()', () => {
        test('adds business days', () => {
            // Mo 12.01 + 5 Tage = Mo 19.01
            const start = new Date(2026, 0, 12);
            const result = addBusinessDays(start, 5);
            expect(result.getDate()).toBe(19);
        });

        test('skips weekends', () => {
            // Fr 16.01 + 1 Tag = Mo 19.01
            const start = new Date(2026, 0, 16);
            const result = addBusinessDays(start, 1);
            expect(result.getDate()).toBe(19);
        });
    });

    // ================================================================
    // Month helpers
    // ================================================================

    describe('getFirstDayOfMonth()', () => {
        test('returns first day', () => {
            const first = getFirstDayOfMonth(new Date(2026, 0, 15));
            expect(first.getDate()).toBe(1);
        });
    });

    describe('getLastDayOfMonth()', () => {
        test('returns last day of January', () => {
            const last = getLastDayOfMonth(new Date(2026, 0, 15));
            expect(last.getDate()).toBe(31);
        });

        test('returns last day of February (leap year)', () => {
            const last = getLastDayOfMonth(new Date(2024, 1, 15));
            expect(last.getDate()).toBe(29);
        });

        test('returns last day of February (non-leap year)', () => {
            const last = getLastDayOfMonth(new Date(2025, 1, 15));
            expect(last.getDate()).toBe(28);
        });
    });

    describe('getDaysInMonth()', () => {
        test('returns 31 for January', () => {
            expect(getDaysInMonth(new Date(2026, 0, 15))).toBe(31);
        });

        test('returns 28 for February (non-leap)', () => {
            expect(getDaysInMonth(new Date(2025, 1, 15))).toBe(28);
        });

        test('returns 29 for February (leap year)', () => {
            expect(getDaysInMonth(new Date(2024, 1, 15))).toBe(29);
        });
    });

    // ================================================================
    // Relative date helpers
    // ================================================================

    describe('isToday()', () => {
        test('returns true for today', () => {
            expect(isToday(new Date())).toBe(true);
        });

        test('returns false for yesterday', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            expect(isToday(yesterday)).toBe(false);
        });
    });

    describe('getRelativeDateString()', () => {
        test('returns "Heute" for today', () => {
            expect(getRelativeDateString(new Date())).toBe('Heute');
        });

        test('returns "Gestern" for yesterday', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            expect(getRelativeDateString(yesterday)).toBe('Gestern');
        });

        test('returns "Morgen" for tomorrow', () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            expect(getRelativeDateString(tomorrow)).toBe('Morgen');
        });

        test('returns formatted date for other days', () => {
            const otherDay = new Date(2020, 5, 15);
            expect(getRelativeDateString(otherDay)).toBe('15.06.2020');
        });
    });
});
