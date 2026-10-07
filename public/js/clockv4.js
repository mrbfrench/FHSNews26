/**
 * @fileoverview This file updates the current time as a simple countdown.
 * @version August 25, 2023
 * @authors Maxime Hendryx-Parker
 **/

var countdown;
var now = new Date();
var endTime;
let hasAdvanced = false;  // Add this flag at the top of the file to track whether we have already advanced the period
let manualNavigation = false; // Flag to indicate manual navigation
// The bell schedule comes from the server (/api/schedule), which an admin can
// switch at /admin. These are the regular-day times, used until it loads or if
// the server can't be reached.
var timePeriodMapping = [
    { startTime: "08:00", endTime: "08:30", periodName: "Passing Period" },
    { startTime: "08:30", endTime: "09:53", periodName: "Period 1" },
    { startTime: "09:53", endTime: "10:01", periodName: "Passing Period" },
    { startTime: "10:01", endTime: "11:24", periodName: "Period 2" },
    { startTime: "11:24", endTime: "11:32", periodName: "Passing Period"},
    { startTime: "11:32", endTime: "13:24", periodName: "Period 3 & Lunch" },
    { startTime: "13:24", endTime: "13:32", periodName: "Passing Period" },
    { startTime: "13:32", endTime: "15:00", periodName: "Period 4" },
];

var lunchTimings = {
    "A": { startTime: "11:24", endTime: "11:54", periodName: "A Lunch" },
    "B": { startTime: "11:54", endTime: "12:24", periodName: "B Lunch" },
    "C": { startTime: "12:24", endTime: "12:54", periodName: "C Lunch" },
    "D": { startTime: "12:54", endTime: "13:24", periodName: "D Lunch"}
};

var lunchPeriodName = "Period 3 & Lunch"; // the period the lunch waves happen in
var activeScheduleKey = null; // "<id>|<date>" of the schedule loaded from the server

// At the top of the file
let currentPeriodIndex = getCurrentPeriodIndex();

function isWeekend(date) {
    return date.getDay() === 0 || date.getDay() === 6;
}

function getCurrentPeriodIndex() {
    if (isWeekend(now)) return -1;

    // Before the first bell it's not school hours yet
    let [startHours, startMinutes] = timePeriodMapping[0].startTime.split(":").map(Number);
    let firstStartTime = new Date(now);
    firstStartTime.setHours(startHours, startMinutes, 0, 0);
    if (now < firstStartTime) return -1;

    for (let i = 0; i < timePeriodMapping.length; i++) {
        let [endHours, endMinutes] = timePeriodMapping[i].endTime.split(":").map(Number);
        let potentialEndTime = new Date(now);
        potentialEndTime.setHours(endHours, endMinutes, 0, 0);

        if (now < potentialEndTime) {
            return i;
        }
    }
    return -1; // Return 0 if outside of all periods
}

function to12HourFormat(timeStr) {
    let [hours, minutes] = timeStr.split(":").map(Number);
    let ampm;
    if (hours >= 12) {
        ampm = "PM"
    } else {
        ampm = "AM"
    }
    hours = hours % 12 || 12; // Convert 0 hours to 12 for 12 AM
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutes} ${ampm}`;
}

window.advanceToNextPeriod = function() {
    manualNavigation = true;
    if (currentPeriodIndex < timePeriodMapping.length - 1) {
        currentPeriodIndex++;
        updatePeriod();
    } else if (currentPeriodIndex === timePeriodMapping.length - 1) {
        currentPeriodIndex = -1;
        updatePeriod();
    }
}

window.advanceToPreviousPeriod = function() {
    manualNavigation = true;
    if (currentPeriodIndex > -1) {
        currentPeriodIndex--;
        updatePeriod();
    } else if (currentPeriodIndex === -1) {
        currentPeriodIndex = timePeriodMapping.length-1;
        updatePeriod()
    }
}


/**
 * Initialize the countdown variables and start the tick function.
 */
function initializeCountdown() {
    countdown = document.getElementById("countdown__timer");
    now = new Date();

    if (!isSchoolHours() || getCurrentPeriodIndex() === -1) {
        manualNavigation = true
    }

    // Attach event listeners for the arrow buttons here
    document.getElementById("prevPeriodBtn").addEventListener("click", advanceToPreviousPeriod);
    document.getElementById("nextPeriodBtn").addEventListener("click", advanceToNextPeriod);

    updatePeriod();
    tick();
}


function isSchoolHours() {
    let firstStartTime = new Date().setHours(...timePeriodMapping[0].startTime.split(":"));
    let lastEndTime = new Date().setHours(...timePeriodMapping.slice(-1)[0].endTime.split(":"));
    return (new Date() >= firstStartTime && new Date() <= lastEndTime);
}

let selectedLunchType = null; // This will store the type of lunch selected, if any

function updatePeriod() {
    let currentPeriodMapping = timePeriodMapping[currentPeriodIndex];

    let realCurrentPeriodIndex = getCurrentPeriodIndex();

    if (currentPeriodMapping) {
        // If this is the lunch period and a lunch has been picked
        if (currentPeriodMapping.periodName === lunchPeriodName && selectedLunchType && lunchTimings[selectedLunchType]) {
            const lunchPeriodMapping = lunchTimings[selectedLunchType];
            //currentPeriodMapping = lunchTimings[selectedLunchType];

            //change currentPeriodMapping to the selected lunchPeriodMapping
            let [lunchStartHours, lunchStartMinutes] = lunchPeriodMapping.startTime.split(":").map(Number);
            let lunchStartTime = new Date(now);
            lunchStartTime.setHours(lunchStartHours, lunchStartMinutes, 0, 0);

            //add 3 lines for end of lunch
            let [lunchEndHours, lunchEndMinutes] = lunchPeriodMapping.endTime.split(":").map(Number);
            let lunchEndTime = new Date(now);
            lunchEndTime.setHours(lunchEndHours, lunchEndMinutes, 0, 0);

            //add 3 lines for end of period 3
            let [periodEndHours, periodEndMinutes] = currentPeriodMapping.endTime.split(":").map(Number);
            let periodEndTime = new Date(now);
            periodEndTime.setHours(periodEndHours, periodEndMinutes, 0, 0);

            if (now < lunchStartTime) {
                // If the selected lunch has not started, set endTime to its startTime
                endTime = lunchStartTime;}
            // add else if
            else if (now < lunchEndTime) {
                // If the selected lunch is in progress, set endTime to its endTime
                endTime = lunchEndTime;
            }
            else {
                // If the selected lunch has ended but period 3 hasn't ended, set endTime to periodEndTime
                endTime = periodEndTime;
            }
           
        } else {
            let [endHours, endMinutes] = currentPeriodMapping.endTime.split(":").map(Number);
            let [startHours, startMinutes] = currentPeriodMapping.startTime.split(":").map(Number);

            if (realCurrentPeriodIndex !== currentPeriodIndex) {
                // If the period being looked at is not the current period, set endTime to startTime
                endTime = new Date(now);
                endTime.setHours(startHours, startMinutes, 0, 0);
            } else {
                // Otherwise, set endTime to the actual end time of the period
                endTime = new Date(now);
                endTime.setHours(endHours, endMinutes, 0, 0);
            }
        }

        document.getElementById("period__header").textContent = currentPeriodMapping.periodName;
        document.getElementById("period__time").textContent = `${to12HourFormat(currentPeriodMapping.startTime)} - ${to12HourFormat(currentPeriodMapping.endTime)}`;

        let [startHours, startMinutes] = currentPeriodMapping.startTime.split(":").map(Number);
        let periodStartTime = new Date(now);
        periodStartTime.setHours(startHours, startMinutes, 0, 0);

        let lunchButtons = document.getElementById("lunch");
        if (currentPeriodMapping.periodName === lunchPeriodName && Object.keys(lunchTimings).length > 0) {
            lunchButtons.classList.remove("hidden");
        } else {
            lunchButtons.classList.add("hidden");
        }

        updateProgressBar(periodStartTime, endTime);
    } else {
        endTime = new Date(now);
        document.getElementById("period__header").textContent = "Not School Hours";
        document.getElementById("period__time").textContent = to12HourFormat(timePeriodMapping[timePeriodMapping.length-1].endTime) + " - " + to12HourFormat(timePeriodMapping[0].startTime);
    }

    if (manualNavigation) {
        if (now > endTime) {
            endTime.setDate(endTime.getDate() + 1);
        }
        manualNavigation = false; // Reset the flag
    }

    // Update gallery dots
    let gallery = document.getElementById("period__gallery");
    gallery.innerHTML = ""; // Clear existing dots

    for (let i = 0; i < timePeriodMapping.length; i++) {
        let dot = document.createElement("div");
        dot.className = "gallery-dot";

        // Mark the active dot based on the current period
        if (i === currentPeriodIndex) {
            dot.classList.add("active");
        }

        gallery.appendChild(dot);
    }
}

function updateProgressBar(periodStartTime, periodEndTime) {
    const totalDuration = periodEndTime - periodStartTime;
    const elapsedDuration = now - periodStartTime;

    // Calculate the percentage of time elapsed
    const progressPercentage = (elapsedDuration / totalDuration) * 100;

    // Set the width of the progress bar
    document.getElementById("countdown__progress").style.width = `${progressPercentage}%`;
}

function updateProgressBarOutside() {
    let periodStartTime = timePeriodMapping[timePeriodMapping.length-1].endTime;
    let periodEndTime = timePeriodMapping[0].startTime;

    const totalDuration = periodEndTime - periodStartTime;
    const elapsedDuration = now - periodStartTime;

    // Calculate the percentage of time elapsed
    const progressPercentage = (elapsedDuration / totalDuration) * 100;

    // Set the width of the progress bar
    document.getElementById("countdown__progress").style.width = `${progressPercentage}%`;
}

window.chooseLunch = function(lunchType, buttonElement) {
    // Get all lunch buttons
    let allLunchButtons = document.querySelectorAll("#lunch__choose .container");

    // If the button clicked is already selected
    if (buttonElement.classList.contains("selected")) {
        // Deselect the button
        buttonElement.classList.remove("selected");
        // Reset the selected lunch type
        selectedLunchType = null;
    } else {
        // If another button was previously selected, deselect it
        allLunchButtons.forEach(btn => btn.classList.remove("selected"));

        // Mark the clicked button as selected
        buttonElement.classList.add("selected");
        // Set the selected lunch type
        selectedLunchType = lunchType;
    }

    // Update the period to reflect the changes
    manualNavigation = true;
    updatePeriod();
}



/**
 * updates the current time and countdown timer
 */
function getTimeRemaining() {
    // If it's not school hours, count down to the next school day's first bell
    if (currentPeriodIndex === -1) {
        let [firstStartHours, firstStartMinutes] = timePeriodMapping[0].startTime.split(":").map(Number);
        let firstStartTime = new Date(now);
        firstStartTime.setHours(firstStartHours, firstStartMinutes, 0, 0);

        // If the time has passed for today, or it's the weekend, move to the next weekday
        if (now > firstStartTime) {
            firstStartTime.setDate(firstStartTime.getDate() + 1);
        }
        while (isWeekend(firstStartTime)) {
            firstStartTime.setDate(firstStartTime.getDate() + 1);
        }

        return ((firstStartTime - now) + 500) / 1000; // in seconds
    }
    // Otherwise, it's a regular school period or passing period
    return ((endTime - now) + 500) / 1000; // in seconds
}

function updateClock() {
    now = new Date();
    let timeRemaining = getTimeRemaining();

    // Reset hasAdvanced flag if the time is not yet expired
    if (timeRemaining > 0) {
        hasAdvanced = false;
    }

    if (timeRemaining <= 0 && !hasAdvanced && !manualNavigation) {
        // ... (existing logic to advance the period)
        currentPeriodIndex = getCurrentPeriodIndex();
        updatePeriod();
        hasAdvanced = true;
        // Count down to the new period's end instead of reloading the page
        timeRemaining = getTimeRemaining();
    }

    // If the time has already expired and it's a manual navigation
    if (timeRemaining <= 0 && manualNavigation) {
        endTime.setDate(endTime.getDate() + 1);
        timeRemaining = ((endTime - now) + 500) / 1000;
        manualNavigation = false; // Reset the flag
    }

    if (timeRemaining < 0) {
        location.reload();
    }

    // Calculate hours, minutes, seconds
    let hours = Math.floor(timeRemaining / 3600);
    timeRemaining %= 3600;
    let minutes = Math.floor(timeRemaining / 60);
    let seconds = Math.floor(timeRemaining % 60);

    // Display time
    if (hours > 0) {
        countdown.textContent = `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    } else {
        countdown.textContent = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    // Update the progress bar
    let currentPeriodMapping = timePeriodMapping[currentPeriodIndex];
    if (currentPeriodMapping) {
        let [startHours, startMinutes] = currentPeriodMapping.startTime.split(":").map(Number);
        let periodStartTime = new Date(now);
        periodStartTime.setHours(startHours, startMinutes, 0, 0);
        updateProgressBar(periodStartTime, endTime);
    }
}

function initializeEndOfYearCountdown() {
    const endOfYearCountdown = document.getElementById("end_year_countdown");
    if (!endOfYearCountdown) return; // the countdown isn't on this page
    const endOfYear = new Date(now.getFullYear(), 4, 29, 15, 0, 0); // May 29 at 3:00 PM

    function updateEndOfYearCountdown() {
        now = new Date();
        let timeRemaining = (endOfYear - now) / 1000; // in seconds

        if (timeRemaining < 0) {
            endOfYearCountdown.textContent = "00:00:00:00"; // Countdown ended
        } else {
            const days = Math.floor(timeRemaining / 86400);
            timeRemaining %= 86400;
            const hours = Math.floor(timeRemaining / 3600);
            timeRemaining %= 3600;
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = Math.floor(timeRemaining % 60);
            endOfYearCountdown.textContent = `${days < 10 ? '0' : ''}${days}:${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }
    }

    function tickEndOfYear() {
        updateEndOfYearCountdown();
        requestAnimationFrame(tickEndOfYear);
    }

    tickEndOfYear();
}


// main loop
function tick() {
    updateClock();
    requestAnimationFrame(tick);
}

function localDateString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Rebuild the lunch buttons for the lunches this schedule has (e.g. A-D or A-C)
function buildLunchButtons() {
    const container = document.getElementById("lunch__choose");
    if (!container) return;
    const letters = Object.keys(lunchTimings);
    container.innerHTML = "";
    letters.forEach(letter => {
        const button = document.createElement("button");
        button.className = "container hover lunch-btn" + (letter === selectedLunchType ? " selected" : "");
        button.style.width = `${100 / letters.length}%`;
        button.textContent = letter;
        button.addEventListener("click", () => chooseLunch(letter, button));
        container.appendChild(button);
    });
}

function applySchedule(schedule) {
    timePeriodMapping = schedule.periods;
    lunchTimings = schedule.lunches || {};
    lunchPeriodName = schedule.lunchPeriod;
    if (!lunchTimings[selectedLunchType]) selectedLunchType = null;
    buildLunchButtons();

    // Show which special schedule is in effect (nothing on a normal day)
    const label = document.getElementById("schedule__name");
    if (label) {
        label.textContent = schedule.isOverride || schedule.id !== "regular" ? schedule.name : "";
        label.hidden = !label.textContent;
    }

    now = new Date();
    currentPeriodIndex = getCurrentPeriodIndex();
    updatePeriod();
}

// Ask the server which schedule is in effect today. Checked every few minutes,
// so open pages pick up a change from the admin page (and the next day's schedule).
function loadSchedule() {
    const today = localDateString(new Date());
    return fetch(`/api/schedule?date=${today}`, { cache: "no-store" })
        .then(response => {
            if (!response.ok) throw new Error(response.status);
            return response.json();
        })
        .then(schedule => {
            const key = `${schedule.id}|${today}`;
            if (key === activeScheduleKey || !Array.isArray(schedule.periods) || schedule.periods.length === 0) return;
            activeScheduleKey = key;
            applySchedule(schedule);
        })
        .catch(error => console.warn("Using the built-in regular schedule:", error));
}

window.addEventListener("DOMContentLoaded", () => {
    initializeCountdown();
    initializeEndOfYearCountdown();
    loadSchedule();
    setInterval(loadSchedule, 5 * 60 * 1000);
});
