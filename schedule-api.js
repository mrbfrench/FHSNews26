/**
 * Bell schedule API.
 *
 * The schedules themselves live in data/schedules.json. Which one is active is
 * stored in data/schedule-state.json:
 *   { "default": "auto", "overrides": { "2026-10-09": "red-day-delay" } }
 * An override applies only on its date, so a one-day change (like a 2 hour
 * delay) switches back to the default on its own the next day.
 *
 * data/planned-days.json lists known special days (like finals) by date. It's
 * deployed with the site, and an override from the admin page still wins.
 *
 * The "auto" default reads the day from the Fishers High School calendar
 * (public/py/calendar/calendar-data): a day titled "Red Day", "Silver Day",
 * "Block 7 Final Day", etc. uses the schedule whose calendarTitle matches.
 *
 * The header countdown ("Fall Break in 7 school days") is also picked on the
 * admin page; its date and the school days before it come from the FHS calendar,
 * so it stays right each year.
 *
 * Changing the state requires the admin password, which is read from the
 * ADMIN_PASSWORD environment variable. If it isn't set, the admin page can't
 * make changes.
 */

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const SCHEDULES_FILE = path.join(DATA_DIR, 'schedules.json');
const STATE_FILE = path.join(DATA_DIR, 'schedule-state.json');
const PLANNED_FILE = path.join(DATA_DIR, 'planned-days.json');
const CALENDAR_DIR = path.join(__dirname, 'public', 'py', 'calendar', 'calendar-data', '19-fishers-high-school');
const AUTO = 'auto';
const FALLBACK_SCHEDULE = 'red-day'; // a school day the calendar doesn't label

// Countdowns the admin can show in the site header, and how to find them on the calendar
const COUNTDOWNS = {
    'fall-break': { label: 'Fall Break', match: /^fall break/i },
    'winter-break': { label: 'Winter Break', match: /^winter break/i },
    'spring-break': { label: 'Spring Break', match: /^spring break/i },
    'last-day': { label: 'Last Day of School', match: /last day (for students|of school)/i },
};
const COUNTDOWN_OFF = 'off';
const DEFAULT_COUNTDOWN = 'last-day';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Lock out an address for 15 minutes after 5 wrong passwords
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const failedLogins = new Map(); // ip -> { count, since }

function loadSchedules() {
    return JSON.parse(fs.readFileSync(SCHEDULES_FILE, 'utf8'));
}

function loadState(schedules) {
    let state = {};
    try {
        state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (error) {
        // No state saved yet
    }
    return {
        default: schedules[state.default] ? state.default : AUTO,
        countdown: COUNTDOWNS[state.countdown] || state.countdown === COUNTDOWN_OFF ? state.countdown : DEFAULT_COUNTDOWN,
        overrides: state.overrides && typeof state.overrides === 'object' ? state.overrides : {},
    };
}

function loadPlannedDays() {
    try {
        return JSON.parse(fs.readFileSync(PLANNED_FILE, 'utf8'));
    } catch (error) {
        return {};
    }
}

function saveState(state) {
    // Write to a temporary file first so a crash can't leave a half-written file
    const tempFile = STATE_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(state, null, 2));
    fs.renameSync(tempFile, STATE_FILE);
}

// Today's date where the server runs, as YYYY-MM-DD
function serverToday() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Read a date's FHS calendar entries: the schedule it names (or null), and whether
// it's marked as a day off (e.g. "Fall Break (No School)")
function calendarDay(schedules, date) {
    const [year, month, day] = date.split('-');
    let events = [];
    try {
        const monthData = JSON.parse(fs.readFileSync(path.join(CALENDAR_DIR, `${year}-${month}.json`), 'utf8'));
        events = monthData[String(Number(day))] || [];
    } catch (error) {
        return { id: null, noSchool: false }; // no calendar data for that month
    }
    const titles = events.map(e => (e && e.title ? e.title.trim().toLowerCase() : ''));
    const id = Object.keys(schedules).find(key =>
        schedules[key].calendarTitle && titles.includes(schedules[key].calendarTitle.toLowerCase())) || null;
    return { id, noSchool: !id && titles.some(t => t.includes('no school')) };
}

function scheduleForDate(schedules, state, date) {
    let id;
    let source;
    const planned = loadPlannedDays()[date];
    if (schedules[state.overrides[date]]) {
        id = state.overrides[date];
        source = 'override';
    } else if (schedules[planned]) {
        id = planned;
        source = 'planned';
    } else if (state.default !== AUTO) {
        id = state.default;
        source = 'default';
    } else {
        const day = calendarDay(schedules, date);
        source = day.id ? 'calendar' : day.noSchool ? 'no-school' : 'fallback';
        id = day.id || FALLBACK_SCHEDULE;
    }
    // On a day off, the periods are still sent so the clock can show the next school day's times
    return { id, date, source, isOverride: source === 'override', noSchool: source === 'no-school', ...schedules[id] };
}

// The next date a countdown counts to: the first day of the next break (or the last
// day of school) on or after `fromDate`, from the FHS calendar. Null if not found.
function countdownDate(key, fromDate) {
    const countdown = COUNTDOWNS[key];
    if (!countdown) return null;

    const dates = [];
    let files = [];
    try {
        files = fs.readdirSync(CALENDAR_DIR).filter(f => /^\d{4}-\d{2}\.json$/.test(f));
    } catch (error) {
        return null;
    }
    for (const file of files) {
        let monthData;
        try {
            monthData = JSON.parse(fs.readFileSync(path.join(CALENDAR_DIR, file), 'utf8'));
        } catch (error) {
            continue; // skip a broken month file
        }
        for (const [day, events] of Object.entries(monthData)) {
            if (!Array.isArray(events) || !/^\d+$/.test(day)) continue;
            if (events.some(e => e && e.title && countdown.match.test(e.title.trim()))) {
                dates.push(`${file.slice(0, 7)}-${day.padStart(2, '0')}`);
            }
        }
    }
    dates.sort();

    // A break covers several days; count to its first day. Days within 4 days of
    // the previous one (a weekend in between) belong to the same break.
    const starts = dates.filter((date, i) => i === 0 || daysBetween(dates[i - 1], date) > 4);
    return starts.find(date => date >= fromDate) || null;
}

function daysBetween(from, to) {
    const [y1, m1, d1] = from.split('-').map(Number);
    const [y2, m2, d2] = to.split('-').map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

// Is this date a school day? Weekdays count unless the FHS calendar marks them as a
// day off ("Labor Day (No School)", "Winter Break (No School)", "Spring Break", ...).
function isSchoolDay(date, monthCache) {
    const [year, month, day] = date.split('-').map(Number);
    const weekday = new Date(year, month - 1, day).getDay();
    if (weekday === 0 || weekday === 6) return false;

    const monthKey = date.slice(0, 7);
    if (!(monthKey in monthCache)) {
        try {
            monthCache[monthKey] = JSON.parse(fs.readFileSync(path.join(CALENDAR_DIR, `${monthKey}.json`), 'utf8'));
        } catch (error) {
            monthCache[monthKey] = {};
        }
    }
    const events = monthCache[monthKey][String(day)] || [];
    return !events.some(e => e && e.title && /no school|^(fall|thanksgiving|winter|spring) break/i.test(e.title.trim()));
}

// School days after today, up to and including the countdown date if it's a school
// day itself (the last day of school is; the first day of a break isn't)
function schoolDaysUntil(today, target) {
    const [y, m, d] = today.split('-').map(Number);
    const monthCache = {};
    let count = 0;
    for (let i = 1; i <= daysBetween(today, target); i++) {
        const day = new Date(y, m - 1, d + i);
        const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
        if (isSchoolDay(date, monthCache)) count++;
    }
    return count;
}

function countdownFor(key, today) {
    if (!COUNTDOWNS[key]) return { key: COUNTDOWN_OFF };
    const date = countdownDate(key, today);
    return {
        key,
        label: COUNTDOWNS[key].label,
        date,
        isToday: date === today,
        todayIsSchoolDay: isSchoolDay(today, {}),
        schoolDays: date ? schoolDaysUntil(today, date) : null,
    };
}

function hash(text) {
    return crypto.createHash('sha256').update(String(text)).digest();
}

function requireAdmin(req, res, next) {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
        return res.status(503).json({ error: 'Admin is turned off: set the ADMIN_PASSWORD environment variable on the server.' });
    }

    const ip = req.ip;
    const record = failedLogins.get(ip);
    if (record && record.count >= MAX_FAILED_LOGINS && Date.now() - record.since < LOCKOUT_MS) {
        return res.status(429).json({ error: 'Too many wrong passwords. Try again in 15 minutes.' });
    }

    // Compare hashes so the check takes the same time whatever was typed
    if (!crypto.timingSafeEqual(hash(req.get('X-Admin-Password') || ''), hash(password))) {
        const fresh = !record || Date.now() - record.since >= LOCKOUT_MS;
        failedLogins.set(ip, { count: fresh ? 1 : record.count + 1, since: fresh ? Date.now() : record.since });
        return res.status(401).json({ error: 'Wrong password.' });
    }

    failedLogins.delete(ip);
    next();
}

const router = express.Router();
router.use(express.json({ limit: '20kb' }));

// The schedule to use on a date (the visitor's own date, so time zones don't matter)
router.get('/schedule', (req, res) => {
    const schedules = loadSchedules();
    const state = loadState(schedules);
    const date = DATE_PATTERN.test(req.query.date || '') ? req.query.date : serverToday();
    res.set('Cache-Control', 'no-store');
    res.json(scheduleForDate(schedules, state, date));
});

// The header countdown, e.g. { label: "Fall Break", date: "2026-10-19", days: 12 }
router.get('/countdown', (req, res) => {
    const state = loadState(loadSchedules());
    const date = DATE_PATTERN.test(req.query.date || '') ? req.query.date : serverToday();
    res.set('Cache-Control', 'no-store');
    res.json(countdownFor(state.countdown, date));
});

// Everything the admin page shows. Nothing here is secret, but only admins need it.
router.get('/admin/state', requireAdmin, (req, res) => {
    const schedules = loadSchedules();
    res.set('Cache-Control', 'no-store');
    // Also say what the next two weeks will look like, so the admin page can show it
    const state = loadState(schedules);
    res.json(adminView(schedules, state, req.query.date));
});

// What the admin page needs: schedules, settings, the next two weeks, and each countdown option
function adminView(schedules, state, date) {
    const today = DATE_PATTERN.test(date || '') ? date : serverToday();
    const countdowns = Object.keys(COUNTDOWNS).map(key => countdownFor(key, today));
    return { schedules, state, upcoming: upcomingDays(schedules, state, today), countdowns };
}

function upcomingDays(schedules, state, fromDate) {
    const start = DATE_PATTERN.test(fromDate || '') ? fromDate : serverToday();
    const [y, m, d] = start.split('-').map(Number);
    const days = [];
    for (let i = 0; i < 14; i++) {
        const day = new Date(y, m - 1, d + i);
        if (day.getDay() === 0 || day.getDay() === 6) continue;
        const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
        const { id, source } = scheduleForDate(schedules, state, date);
        days.push({ date, id, source });
    }
    return days;
}

router.put('/admin/state', requireAdmin, (req, res) => {
    const schedules = loadSchedules();
    const body = req.body || {};

    if (body.default !== AUTO && !schedules[body.default]) {
        return res.status(400).json({ error: 'Unknown default schedule.' });
    }
    const countdown = body.countdown === undefined ? loadState(schedules).countdown : body.countdown;
    if (!COUNTDOWNS[countdown] && countdown !== COUNTDOWN_OFF) {
        return res.status(400).json({ error: 'Unknown countdown.' });
    }

    // Keep valid overrides, and drop ones more than a week old
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const overrides = {};
    for (const [date, id] of Object.entries(body.overrides || {})) {
        if (!DATE_PATTERN.test(date) || !schedules[id]) {
            return res.status(400).json({ error: `Invalid override for ${date}.` });
        }
        if (date >= weekAgo) overrides[date] = id;
    }

    const state = { default: body.default, overrides, countdown };
    saveState(state);
    res.json(adminView(schedules, state, req.query.date));
});

module.exports = router;
