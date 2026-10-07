/**
 * Downloads school calendars from the HSE Schools websites (Finalsite) and
 * writes them as JSON for the calendar page.
 *
 * The old source, hsecalendars.org, was shut down and now redirects to
 * Arbiter's marketing site. Each school site (e.g. fhs.hseschools.org) has a
 * month-view calendar widget that can be loaded one month at a time from
 * /fs/elements/<elementId>?cal_date=YYYY-MM-01, which is what this script reads.
 *
 * Fishers High School also gets its varsity home games from the athletics site
 * (fisherstigersathletics.com, run by EventLink).
 *
 * Run from the project root:  npm run update-calendar
 * Just some schools:          npm run update-calendar -- fhs hhs
 *
 * Output (same format as before):
 *   public/py/calendar/calendar-data/<folder>/<YYYY-MM>.json
 *     { "<day>": [ { "title", "time", "location" }, ... ], ... }
 *   public/py/calendar/school-ids.json   { "<folder>": "<SCHOOL NAME>" }
 */

const fs = require('fs');
const path = require('path');

const CALENDAR_DIR = path.join(__dirname, '..', 'public', 'py', 'calendar');
const SCHEDULE_DATA_DIR = path.join(__dirname, '..', 'data'); // bell schedules and planned days (finals)
const DATA_DIR = path.join(CALENDAR_DIR, 'calendar-data');
const REQUEST_DELAY_MS = 250; // be polite to the school servers
const USER_AGENT = 'FHS News calendar updater';

// Subdomain on hseschools.org -> folder name used by the calendar page.
// The number prefix matches the old school ids (used by school_specific_recurring_events.json).
const SCHOOLS = [
    { sub: 'cre', folder: '1-cumberland-road-elementary', name: 'CUMBERLAND ROAD ELEMENTARY' },
    { sub: 'fce', folder: '3-fall-creek-elementary', name: 'FALL CREEK ELEMENTARY' },
    { sub: 'fes', folder: '4-fishers-elementary', name: 'FISHERS ELEMENTARY' },
    { sub: 'ges', folder: '5-geist-elementary', name: 'GEIST ELEMENTARY' },
    { sub: 'hpe', folder: '6-harrison-parkway-elementary', name: 'HARRISON PARKWAY ELEMENTARY' },
    { sub: 'hre', folder: '7-hoosier-road-elementary', name: 'HOOSIER ROAD ELEMENTARY' },
    { sub: 'lre', folder: '8-lantern-road-elementary', name: 'LANTERN ROAD ELEMENTARY' },
    { sub: 'nbe', folder: '9-new-britton-elementary', name: 'NEW BRITTON ELEMENTARY' },
    { sub: 'sce', folder: '10-sand-creek-elementary', name: 'SAND CREEK ELEMENTARY' },
    { sub: 'tce', folder: '11-thorpe-creek-elementary', name: 'THORPE CREEK ELEMENTARY' },
    { sub: 'fci', folder: '12-fall-creek-intermediate', name: 'FALL CREEK INTERMEDIATE' },
    { sub: 'rsi', folder: '13-riverside-intermediate-school', name: 'RIVERSIDE INTERMEDIATE SCHOOL' },
    { sub: 'sci', folder: '14-sand-creek-intermediate', name: 'SAND CREEK INTERMEDIATE' },
    { sub: 'fjh', folder: '15-fishers-junior-high', name: 'FISHERS JUNIOR HIGH' },
    { sub: 'hij', folder: '16-hse-intermediate-junior-high', name: 'HSE INTERMEDIATE & JUNIOR HIGH' },
    { sub: 'rjh', folder: '17-riverside-junior-high', name: 'RIVERSIDE JUNIOR HIGH' },
    { sub: 'fcj', folder: '18-fall-creek-junior-high', name: 'FALL CREEK JUNIOR HIGH' },
    { sub: 'fhs', folder: '19-fishers-high-school', name: 'FISHERS HIGH SCHOOL', redSilverDays: true,
      sportsSite: 'https://fisherstigersathletics.com' },
    { sub: 'hhs', folder: '20-hamilton-southeastern-high-school', name: 'HAMILTON SOUTHEASTERN HIGH SCHOOL' },
    { sub: 'bse', folder: '21-brooks-school-elementary', name: 'BROOKS SCHOOL ELEMENTARY' },
    { sub: 'dce', folder: '22-deer-creek-elementary', name: 'DEER CREEK ELEMENTARY' },
    { sub: 'ses', folder: '23-southeastern-elementary', name: 'SOUTHEASTERN ELEMENTARY' },
];

// Days with any of these in an event title don't count in the Red/Silver rotation
const NO_ROTATION_KEYWORDS = [
    'no school', 'teacher day', 'teacher work day', 'elearning', 'e-learning', 'testing day',
    'flex day', 'psat', 'sat day', 'sat testing', 'semester exams',
];
// Break days are titled like "Winter Break (No School)"; only titles that start with
// these count, so "First Day Back from Winter Break" is still a school day
const BREAK_PREFIXES = ['fall break', 'thanksgiving break', 'winter break', 'spring break'];
const LAST_DAY_TITLES = ['last day of school', 'last day for students'];

function isNonRotationDay(titles) {
    return titles.some(t => NO_ROTATION_KEYWORDS.some(k => t.includes(k)) || BREAK_PREFIXES.some(b => t.startsWith(b)));
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchText(url) {
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
            if (response.ok) return await response.text();
            if (response.status === 404) return null;
            throw new Error(`HTTP ${response.status}`);
        } catch (error) {
            if (attempt === 3) throw new Error(`${url}: ${error.message}`);
            await sleep(2000 * attempt);
        }
    }
}

function decodeHtml(text) {
    return text
        .replace(/<[^>]*>/g, '')
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
        .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

// Find the school's month-view ("grid") calendar widget on its calendar page
async function findCalendarElement(school) {
    for (const page of ['/our-school/calendar', '/our-school/calendars']) {
        const html = await fetchText(`https://${school.sub}.hseschools.org${page}`);
        await sleep(REQUEST_DELAY_MS);
        if (!html) continue;
        const match = html.match(/class="fsElement fsCalendar fsGrid[^"]*" id="fsEl_(\d+)"/);
        if (match) return match[1];
    }
    return null;
}

// "2026-10-06T19:00:00-04:00" -> "7:00pm" (the time as shown at the school)
function formatTime(isoString) {
    const match = isoString.match(/T(\d{2}):(\d{2})/);
    if (!match) return null;
    const hours = Number(match[1]);
    const suffix = hours >= 12 ? 'pm' : 'am';
    return `${hours % 12 || 12}:${match[2]}${suffix}`;
}

// Parse one month of the calendar widget into { day: [events] }
function parseMonth(html) {
    const days = {};
    const boxes = html.split('<div class="fsCalendarDaybox').slice(1);
    for (const box of boxes) {
        // Skip the greyed-out days from the previous/next month
        if (/^[^>]*fsCalendarOutOfRange/.test(box)) continue;
        const dayMatch = box.match(/data-day="(\d+)"/);
        if (!dayMatch) continue;

        const events = [];
        for (const info of box.split('<div class="fsCalendarInfo">').slice(1)) {
            const titleMatch = info.match(/class="fsCalendarEventTitle[^"]*"[^>]*title="([^"]*)"/);
            if (!titleMatch) continue;
            const start = info.match(/<time datetime="([^"]+)" class="fsStartTime"/);
            const end = info.match(/<time datetime="([^"]+)" class="fsEndTime"/);
            const location = info.match(/<div class="fsLocation">([\s\S]*?)<\/div>/);

            let time = start ? formatTime(start[1]) : null;
            if (time && end) time += ` - ${formatTime(end[1])}`;

            events.push({
                title: decodeHtml(titleMatch[1]),
                time: time,
                location: location ? decodeHtml(location[1]) || null : null,
            });
        }
        if (events.length > 0) days[dayMatch[1]] = events;
    }
    return days;
}

const MONTH_NUMBERS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

// Varsity teams only: skip JV and freshman squads like "Soccer (Girls JV1)" or "Football (F)"
function isVarsity(team) {
    return !/\b(JV ?\d*|F)\)/.test(team);
}

// Read varsity home games for the school year from the EventLink athletics site.
// Returns { "YYYY-MM": { day: [events] } }
async function fetchSports(site, startYear) {
    const months = {};
    const range = `academicYear=${startYear}&from=${startYear}-07-01&to=${startYear + 1}-06-30`;
    let count = 0;

    for (let page = 1; page <= 200; page++) {
        const html = await fetchText(`${site}/Events?${range}&pageNumber=${page}`);
        await sleep(REQUEST_DELAY_MS);
        if (!html) break;

        const rows = html.split('<tr class="').slice(1);
        for (const row of rows) {
            if (row.startsWith('canceled-event')) continue;
            if (!row.includes('title="Home Game"')) continue;

            const team = row.match(/<h4 class="fw-bold my-auto">([\s\S]*?)<\/h4>/);
            if (!team || !isVarsity(decodeHtml(team[1]))) continue;

            const cells = row.split('<td').slice(1);
            const lines = cell => (cell.match(/<p class="m[^"]*">([\s\S]*?)<\/p>/g) || [])
                .map(p => decodeHtml(p.replace(/<span[\s\S]*?<\/span>/g, ''))).filter(Boolean);
            const [details = [], when = [], where = []] = [lines(cells[1] || ''), lines(cells[2] || ''), lines(cells[3] || '')];

            // "Tue, Oct. 6 2026"
            const date = (when[0] || '').match(/([A-Za-z]{3})[a-z]*\.? (\d{1,2}) (\d{4})/);
            if (!date || !MONTH_NUMBERS[date[1].toLowerCase()]) continue;
            const yearMonth = `${date[3]}-${String(MONTH_NUMBERS[date[1].toLowerCase()]).padStart(2, '0')}`;
            const day = String(Number(date[2]));

            // "6:00 PM EDT" -> "6:00pm"; "TBD" stays as is
            const timeMatch = (when[1] || '').match(/(\d{1,2}:\d{2}) ?(AM|PM)/i);
            const time = timeMatch ? timeMatch[1] + timeMatch[2].toLowerCase() : (when[1] || null);

            const opponent = details[0] || '';
            if (/(^|: )JV\b/.test(opponent)) continue; // JV games inside a tournament entry
            months[yearMonth] = months[yearMonth] || {};
            (months[yearMonth][day] = months[yearMonth][day] || []).push({
                title: `${decodeHtml(team[1])}${opponent ? ': ' + opponent : ''} (Home)`,
                time: time,
                location: where[0] || null,
            });
            count++;
        }

        if (!html.includes(`pageNumber=${page + 1}`)) break;
    }
    return { months, count };
}

function readJson(file, fallback) {
    try {
        return JSON.parse(fs.readFileSync(path.join(CALENDAR_DIR, file), 'utf8'));
    } catch (error) {
        return fallback;
    }
}

// Add holidays and school-specific yearly events (keys are "MM-DD")
function addRecurringEvents(months, school) {
    const globalEvents = readJson('global_recurring_events.json', {});
    const schoolId = school.folder.split('-')[0];
    const schoolEvents = readJson('school_specific_recurring_events.json', {})[schoolId] || {};

    for (const recurring of [globalEvents, schoolEvents]) {
        for (const [monthDay, events] of Object.entries(recurring)) {
            const [month, day] = monthDay.split('-');
            for (const yearMonth of Object.keys(months)) {
                if (yearMonth.endsWith(`-${month}`)) {
                    const key = String(Number(day)); // the page looks days up without leading zeros
                    months[yearMonth][key] = (months[yearMonth][key] || []).concat(
                        events.map(e => ({ title: e.title, time: e.time || null, location: e.location || null }))
                    );
                }
            }
        }
    }
}

// Special days from data/planned-days.json (e.g. finals), as { "YYYY-MM-DD": "Schedule Name" }
function plannedDayNames() {
    try {
        const schedules = JSON.parse(fs.readFileSync(path.join(SCHEDULE_DATA_DIR, 'schedules.json'), 'utf8'));
        const planned = JSON.parse(fs.readFileSync(path.join(SCHEDULE_DATA_DIR, 'planned-days.json'), 'utf8'));
        const names = {};
        for (const [date, id] of Object.entries(planned)) {
            if (schedules[id]) names[date] = schedules[id].calendarTitle || schedules[id].name;
        }
        return names;
    } catch (error) {
        return {};
    }
}

// Mark school days as alternating Red Day / Silver Day, starting on the first day of school.
// Planned days (finals) get their schedule's name instead and don't count in the rotation.
function addRedSilverDays(months) {
    const planned = plannedDayNames();
    let color = null;
    for (const yearMonth of Object.keys(months).sort()) {
        const [year, month] = yearMonth.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const weekday = new Date(year, month - 1, day).getDay();
            if (weekday === 0 || weekday === 6) continue;

            const events = months[yearMonth][day] || [];
            const date = `${yearMonth}-${String(day).padStart(2, '0')}`;
            if (planned[date]) {
                months[yearMonth][day] = [{ title: planned[date], time: null, location: null }].concat(events);
                continue;
            }
            const titles = events.map(e => e.title.toLowerCase());
            if (titles.some(t => t.includes('first day of school'))) color = 'Red Day';
            if (titles.some(t => LAST_DAY_TITLES.some(l => t.includes(l)))) {
                color = null;
                continue;
            }
            if (!color || isNonRotationDay(titles)) continue;

            months[yearMonth][day] = [{ title: color, time: null, location: null }].concat(events);
            color = color === 'Red Day' ? 'Silver Day' : 'Red Day';
        }
    }
}

function schoolYearStart() {
    const now = new Date();
    return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

// July through June of the current school year
function schoolYearMonths() {
    const startYear = schoolYearStart();
    const months = [];
    for (let i = 0; i < 12; i++) {
        const date = new Date(startYear, 6 + i, 1);
        months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }
    return months;
}

async function updateSchool(school, yearMonths) {
    const elementId = await findCalendarElement(school);
    if (!elementId) throw new Error('could not find the calendar on the school website');

    const months = {};
    for (const yearMonth of yearMonths) {
        const html = await fetchText(`https://${school.sub}.hseschools.org/fs/elements/${elementId}?cal_date=${yearMonth}-01`);
        await sleep(REQUEST_DELAY_MS);
        if (!html || !html.includes('fsCalendarDaybox')) throw new Error(`unexpected calendar page for ${yearMonth}`);
        months[yearMonth] = parseMonth(html);
    }

    addRecurringEvents(months, school);
    if (school.redSilverDays) addRedSilverDays(months);

    // Games go after the school events (and after the Red/Silver rotation, which they don't affect)
    if (school.sportsSite) {
        try {
            const sports = await fetchSports(school.sportsSite, schoolYearStart());
            for (const [yearMonth, days] of Object.entries(sports.months)) {
                if (!months[yearMonth]) continue;
                for (const [day, games] of Object.entries(days)) {
                    months[yearMonth][day] = (months[yearMonth][day] || []).concat(games);
                }
            }
            console.log(`  ${school.name}: ${sports.count} varsity home games`);
        } catch (error) {
            // Still save the school events if the athletics site is down
            console.error(`  ${school.name}: sports schedule not updated - ${error.message}`);
        }
    }

    const folder = path.join(DATA_DIR, school.folder);
    fs.mkdirSync(folder, { recursive: true });
    let eventCount = 0;
    for (const [yearMonth, days] of Object.entries(months)) {
        const sorted = {};
        Object.keys(days).sort((a, b) => a - b).forEach(day => { sorted[day] = days[day]; });
        eventCount += Object.values(sorted).reduce((n, events) => n + events.length, 0);
        fs.writeFileSync(path.join(folder, `${yearMonth}.json`), JSON.stringify(sorted, null, 4));
    }
    return eventCount;
}

async function main() {
    const yearMonths = schoolYearMonths();
    console.log(`Updating calendars for ${yearMonths[0]} through ${yearMonths[yearMonths.length - 1]}`);

    const only = process.argv.slice(2);
    const schools = only.length ? SCHOOLS.filter(s => only.includes(s.sub)) : SCHOOLS;
    let failures = 0;
    for (const school of schools) {
        try {
            const count = await updateSchool(school, yearMonths);
            console.log(`  ${school.name}: ${count} events`);
        } catch (error) {
            failures++;
            console.error(`  ${school.name}: FAILED - ${error.message}`);
        }
    }

    // List every school that has data, in the order above
    const schoolIds = {};
    for (const school of SCHOOLS) {
        if (fs.existsSync(path.join(DATA_DIR, school.folder))) schoolIds[school.folder] = school.name;
    }
    fs.writeFileSync(path.join(CALENDAR_DIR, 'school-ids.json'), JSON.stringify(schoolIds, null, 2));
    console.log(failures ? `Done with ${failures} failure(s).` : 'Done.');
    process.exitCode = failures ? 1 : 0;
}

main();
