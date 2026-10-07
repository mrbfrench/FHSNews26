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

// Everything the admin page shows. Nothing here is secret, but only admins need it.
router.get('/admin/state', requireAdmin, (req, res) => {
    const schedules = loadSchedules();
    res.set('Cache-Control', 'no-store');
    // Also say what the next two weeks will look like, so the admin page can show it
    const state = loadState(schedules);
    res.json({ schedules, state, upcoming: upcomingDays(schedules, state, req.query.date) });
});

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

    // Keep valid overrides, and drop ones more than a week old
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const overrides = {};
    for (const [date, id] of Object.entries(body.overrides || {})) {
        if (!DATE_PATTERN.test(date) || !schedules[id]) {
            return res.status(400).json({ error: `Invalid override for ${date}.` });
        }
        if (date >= weekAgo) overrides[date] = id;
    }

    const state = { default: body.default, overrides };
    saveState(state);
    res.json({ schedules, state, upcoming: upcomingDays(schedules, state, req.query.date) });
});

module.exports = router;
