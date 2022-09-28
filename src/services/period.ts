// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols

import {startOfDay, subDays, startOfHour, subHours, startOfMonth, subMonths, startOfYear, subYears, endOfWeek,
    startOfWeek, endOfYear, endOfMonth, endOfDay, endOfHour, startOfQuarter, endOfQuarter, addWeeks,
} from 'date-fns';

export function getLastHourDate(now) {
    return subHours(startOfHour(now), 1);
}
export function getCurrentHourDate(now) {
    return startOfHour(now);
}

export function getLastDayDate(now) {
    return subDays(startOfDay(now), 1);
}
export function getCurrentDayDate(now) {
    return startOfDay(now);
}

export function getLastMonthDate(now) {
    return subMonths(startOfMonth(now), 1);
}
export function getCurrentMonthDate(now) {
    return startOfMonth(now);
}

export function getLastYearDate(now) {
    return subYears(startOfYear(now), 1);
}
export function getCurrentYearDate(now) {
    return startOfYear(now);
}

export function weekStartDate(now) {
    return startOfWeek(now); // @todo fix bug of period starting on sunday with => , {weekStartsOn: 1}
}
export function weekEndDate(now) {
    return endOfWeek(now);
}
export function yearStartDate(now) {
    return startOfYear(now);
}
export function yearEndDate(now) {
    return endOfYear(now);
}
export function monthStartDate(now) {
    return startOfMonth(now);
}
export function monthEndDate(now) {
    return endOfMonth(now);
}
export function dayStartDate(now) {
    return startOfDay(now);
}
export function dayEndDate(now) {
    return endOfDay(now);
}
export function hourStartDate(now) {
    return startOfHour(now);
}
export function hourEndDate(now) {
    return endOfHour(now);
}
export function quarterStartDate(now) {
    return startOfQuarter(now);
}
export function quarterEndDate(now) {
    return endOfQuarter(now);
}
export function biweekStartDate(now) {
    return undefined;
}
export function biweekEndDate(now) {
    return undefined;
}
export function semesterStartDate(now) {
    return undefined;
}
export function semesterEndDate(now) {
    return undefined;
}
export function hourQuarterStartDate(now) {
    return undefined;
}
export function hourQuarterEndDate(now) {
    return undefined;
}
export function buildDate({year, month, week, day, hour}) {
    if (week) return buildWeekDate({year, week});
    if (hour) return buildHourDate({year, month, day, hour});
    if (day) return buildDayDate({year, month, day});
    if (month) return buildMonthDate({year, month});
    if (year) return buildYearDate({year});

    return undefined;
}

export function z(x) {
    return x > 9 ? `${x}` : `0${x}`;
}
export function buildWeekDate({year, week}) {
    return addWeeks(new Date(`${year}-01-01T00:00:00Z`), week);
}
export function buildHourDate({year, month, day, hour}) {
    return new Date(`${year}-${z(month)}-${z(day)}T${z(hour)}:00:00Z`);
}
export function buildDayDate({year, month, day}) {
    return new Date(`${year}-${z(month)}-${z(day)}T00:00:00Z`);
}
export function buildMonthDate({year, month}) {
    return new Date(`${year}-${z(month)}-01T00:00:00Z`);
}
export function buildYearDate({year}) {
    return new Date(`${year}-01-01T00:00:00Z`);
}