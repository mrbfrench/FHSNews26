document.addEventListener('DOMContentLoaded', () => {
    // Initialization
    const themeButtons = document.querySelectorAll('.theme-button');
    initializeThemes(themeButtons);
    incrementDailyVisits(); // Increment the visit count if it's a new day
    updateVisitCounterDisplay(); // Update the display on page load
    updateThemeCounterDisplay(); // Update the display on page load
    checkConsecutiveVisits(); // Check and update consecutive visits for the midnight theme
    updateConsecutiveVisitCounterDisplay(); // Update the display on page load
    initialize2048();

    // Event Listeners
    attachEventListenersToThemeButtons(themeButtons);
    attachEventListenerToThemeSelector();
    attachEventListenerToModal();
    attachEventListenersToGamesMenu();
    // Setup event listener for each Check Answer button
    setupPuzzleAnswerCheckers();

    // Event listener for the "Check Answer" button for the purple theme
    document.getElementById('check-answer-purple').addEventListener('click', () => {
        checkVisitsAndUnlockTheme('purple');
    });

        // Event listener for the "Check Answer" button for the purple theme
    document.getElementById('check-answer-green').addEventListener('click', () => {
        checkVisitsAndUnlockTheme('green');
    });

    // Event listener for the "Check Answer" button for the purple theme
    document.getElementById('check-answer-shaded').addEventListener('click', () => {
        checkNumberOfUnlockedThemesShaded()
    });

    // Event listener for the "Check Answer" button for the midnight theme
    document.getElementById('check-answer-midnight').addEventListener('click', () => {
        checkConsecutiveVisitsAndUnlockTheme('midnight');
    });

    // Event listener for the "Check Answer" button for the midnight theme
    document.getElementById('check-answer-gradient').addEventListener('click', () => {
        checkConsecutiveVisitsAndUnlockTheme('gradient');
    });

    // Event listener for the "Check Answer" button for the midnight theme
    document.getElementById('check-answer-snow').addEventListener('click', () => {
        checkSnowThemeUnlock('snow');
    });

    // Event listener to submit on pressing the "Enter" key
    document.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            // Check which puzzle is currently open
            const modalOpen = document.getElementById('puzzleModal').style.display === 'block';
            const openedPuzzle = modalOpen && document.querySelector('.puzzle[style="display: block;"]');
            if (openedPuzzle && openedPuzzle.getAttribute('data-theme') === 'blue') {
                checkAnswer('blue');
            }
            if (openedPuzzle && openedPuzzle.getAttribute('data-theme') === 'purple') {
                checkVisitsAndUnlockTheme('purple');
            }
            if (openedPuzzle && openedPuzzle.getAttribute('data-theme') === 'green') {
                checkVisitsAndUnlockTheme('green');
            }
            if (openedPuzzle && openedPuzzle.getAttribute('data-theme') === 'midnight') {
                checkConsecutiveVisitsAndUnlockTheme('midnight');
            }
            if (openedPuzzle && openedPuzzle.getAttribute('data-theme') === 'gradient') {
                checkConsecutiveVisitsAndUnlockTheme('gradient');
            }
            if (openedPuzzle && openedPuzzle.getAttribute('data-theme') === 'snow') {
                checkSnowThemeUnlock();
            }
            if (openedPuzzle && openedPuzzle.getAttribute('data-theme') === 'forest') {
                checkAnswer('forest');
            }
            if (openedPuzzle && openedPuzzle.getAttribute('data-theme') === 'ocean') {
                if (document.getElementById('part-1-ocean').style.display !== 'none') {
                    checkAnswer('ocean')
                } else if (document.getElementById('part-2-ocean').style.display !== 'none') {
                    checkAnswer('ocean', 1)
                }
            }
            if (openedPuzzle && openedPuzzle.getAttribute('data-theme') === 'library') {
                checkAnswer('library');
            }
            if (openedPuzzle && openedPuzzle.getAttribute('data-theme') === 'hartley') {
                checkAnswer('hartley');
            }
            if (openedPuzzle && openedPuzzle.getAttribute('data-theme') === 'vaporwave') {
                checkAnswer('vaporwave');
            }
            if (openedPuzzle && openedPuzzle.getAttribute('data-theme') === 'mountain') {
                if (document.getElementById('part-1-mountain').style.display !== 'none') {
                    checkAnswer('mountain')
                } else if (document.getElementById('part-2-mountain').style.display !== 'none') {
                    checkAnswer('mountain', 1)
                } else if (document.getElementById('part-3-mountain').style.display !== 'none') {
                    checkAnswer('mountain', 2)
                }
            }
            if (openedPuzzle && openedPuzzle.getAttribute('data-theme') === 'sunset') {
                checkAnswer('sunset');
            }
            if (openedPuzzle && openedPuzzle.getAttribute('data-theme') === 'shaded') {
                checkNumberOfUnlockedThemesShaded();
            }
            if (openedPuzzle && openedPuzzle.getAttribute('data-theme') === 'lebron') {
                checkAnswer('lebron');
            }
        }
    });
});

function initializeThemes(themeButtons) {
    const savedTheme = localStorage.getItem('selectedTheme') || 'default';
    localStorage.setItem('themeUnlocked-default', true); // Ensure default theme is always unlocked
    localStorage.setItem('themeUnlocked-dark', true); // Ensure default theme is always unlocked

    themeButtons.forEach(button => {
        const theme = button.getAttribute('data-theme');
        if (localStorage.getItem(`themeUnlocked-${theme}`)) {
            button.classList.add('unlocked');
        } else {
            button.classList.add('locked-theme');
        }
    });

    switchTheme(savedTheme); // Switch to the saved theme
    setActiveButton(savedTheme); // Set the active button
}

function setupPuzzleAnswerCheckers() {
    document.querySelectorAll('.puzzle-answer-button').forEach(button => {
        button.addEventListener('click', function() {
            const theme = button.getAttribute('data-theme');
            const part = button.getAttribute('data-part');
            const partIndex = part ? parseInt(part, 10) - 1 : 0; // Default to 0 if no part is provided
            checkAnswer(theme, partIndex);
        });
    });
}

// Object to hold the correct answers for each theme and part
const beepBorpBoop = {
    blue: {
        parts: ['brightness'] // Only one part for the blue theme
    },
    dark: {
        parts: ['']
    },
    forest: {
        parts: ['tree'] // Only one part for the forest theme
    },
    ocean: {
        parts: ['waved', 'tuvalu'] // Two parts for the ocean theme
    },
    vaporwave: {
        parts: ['a bird in the hand is messy']
    },
    library: {
        parts: ['8']
    },
    mountain: {
        parts: ['china', 'sweden', 'spain']
    },
    hartley: {
        parts: ['bitcoin']
    },
    sunset: {
        parts: ['55']
    },
    lebron: {
        parts: ['3']
    }
    // Add more themes and parts as needed
};

function getCorrectAnswerForThemePart(theme, partIndex) {
    // Retrieve the correct answer for a theme's specific part
    // The partIndex is expected to start from 0 for the first part
    const themeInfo = beepBorpBoop[theme];
    if (themeInfo && themeInfo.parts[partIndex] !== undefined) {
    return themeInfo.parts[partIndex];
    } else {
    console.error('No answer found for the specified theme and part index.');
    return null; // No answer found for this theme and part
    }
}
function attachEventListenersToThemeButtons(themeButtons) {
    themeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const theme = button.getAttribute('data-theme');
            if (button.classList.contains('locked-theme')) {
                openPuzzle(theme);
            } else {
                switchTheme(theme);
                setActiveButton(theme);
            }
        });
    });

    document.getElementById('reset-themes-button').addEventListener('click', resetUnlockedThemes);
}

function switchTheme(themeName) {
    const themeLink = document.getElementById('theme-style');
    const newThemePath = `themes/${themeName}.css`;
    if (themeLink.getAttribute('href') !== newThemePath) {
        themeLink.setAttribute('href', newThemePath);
    }
    localStorage.setItem('selectedTheme', themeName);
}

function setActiveButton(activeTheme) {
    const themeButtons = document.querySelectorAll('.theme-button');
    const themeShop = document.getElementById('theme_selector');
    themeButtons.forEach(button => {
        if (button.getAttribute('data-theme') === activeTheme) {
            button.classList.add('active');
            if (activeTheme === 'gradient') {
                themeShop.style.backgroundSize = "cover";
                themeShop.style.backgroundPosition = "0px 50%";
            } else {
                themeShop.style.backgroundSize = "26px";
                themeShop.style.backgroundPosition = "4px 50%";
                themeShop.style.backgroundRepeat = "no-repeat";
            }
            themeShop.style.backgroundColor = button.style.backgroundColor;
            themeShop.style.backgroundImage = button.style.backgroundImage;
        } else {
            button.classList.remove('active');
        }
    });
}

function openPuzzle(theme) {
    const puzzles = document.querySelectorAll('.puzzle');
    puzzles.forEach(puzzle => puzzle.style.display = 'none'); // Hide all puzzles

    const modal = document.getElementById('puzzleModal');
    const puzzle = document.querySelector(`.puzzle[data-theme="${theme}"]`);
    if (puzzle) {
        puzzle.style.display = 'block'; // Show the right puzzle
    }
    document.body.classList.add('modal-open'); // Prevent scrolling on the background
    modal.style.display = 'block';
    if (theme === 'space' && chessBoard) chessBoard.resize(); // Board was measured while hidden
}

function closePuzzle() {
    document.body.classList.remove('modal-open'); // Prevent scrolling on the background
    const modal = document.getElementById('puzzleModal');
    modal.style.display = 'none';

    // Games opened from the Games menu have no theme selector behind them
    if (modal.classList.contains('game-mode')) {
        modal.classList.remove('game-mode');
        closeSelector();
    }
}

function attachEventListenersToGamesMenu() {
    const gamesButton = document.getElementById('games_selector');
    const gamesDropdown = document.getElementById('games_dropdown');

    gamesButton.addEventListener('click', (event) => {
        event.stopPropagation();
        document.getElementById('events_dropdown').classList.add('hidden');
        gamesDropdown.classList.toggle('hidden');
    });

    document.querySelectorAll('.game-option').forEach(option => {
        option.addEventListener('click', (event) => {
            event.stopPropagation();
            gamesDropdown.classList.add('hidden');
            openGame(option.getAttribute('data-game'));
        });
    });

    // Close the dropdown when clicking anywhere else
    document.addEventListener('click', () => gamesDropdown.classList.add('hidden'));
}

// Open a puzzle game (chess or 2048) to play for fun, whether or not its theme is unlocked
function openGame(theme) {
    // The puzzle modal lives inside the theme selector's blur overlay
    document.getElementById('themes_blur').classList.remove('hidden');
    document.getElementById('themes_selector').classList.add('hidden');
    document.getElementById('puzzleModal').classList.add('game-mode');
    openPuzzle(theme);
}

function checkAnswer(theme, partIndex = 0) {
    // Determine if the puzzle is a single-part or multi-part puzzle
    const isMultiPartPuzzle = beepBorpBoop[theme] && beepBorpBoop[theme].parts.length > 1;
    const answerBoxId = isMultiPartPuzzle ? `answer-${theme}-part-${partIndex + 1}` : `answer-${theme}`;
    const feedbackElementId = isMultiPartPuzzle ? `feedback-message-${theme}-part-${partIndex + 1}` : `feedback-message-${theme}`;

    const answerBox = document.getElementById(answerBoxId);
    if (!answerBox) {
        console.error(`No input box found for ID: ${answerBoxId}`);
        return;
    }

    const userAnswer = answerBox.value.trim().toLowerCase();
    const feedbackElement = document.getElementById(feedbackElementId);

    if (feedbackElement) feedbackElement.textContent = '';

    const correctAnswer = getCorrectAnswerForThemePart(theme, partIndex);

    if (userAnswer === correctAnswer) {
        if (beepBorpBoop[theme].parts.length > partIndex + 1) {
            // If there's a next part, show it
            const currentPartId = `part-${partIndex + 1}-${theme}`;
            const nextPartId = `part-${partIndex + 2}-${theme}`;
            document.getElementById(currentPartId).style.display = 'none';
            document.getElementById(nextPartId).style.display = 'block';
        } else {
            // Last part answered correctly, or it's a single-part puzzle, unlock the theme
            meepMorp(theme);
            runConfetti();

            if (partIndex > 0) {
                const currentPartId = `part-${partIndex + 1}-${theme}`;
                const startingPartId = `part-1-${theme}`;
                document.getElementById(currentPartId).style.display = 'none';
                document.getElementById(startingPartId).style.display = 'block';
            }
        }
    } else {
        // Shake the modal and clear the input
        const modalContent = document.querySelector('.modal-content');
        modalContent.classList.add('shakeThemes');
        setTimeout(() => modalContent.classList.remove('shakeThemes'), 500); // Remove class after animation

        if (feedbackElement) feedbackElement.textContent = 'Incorrect answer. Try again.';
    }
}

function runConfetti() {
    // Make sure the confetti script is loaded before calling this function
    if (typeof confetti === "function") {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    } else {
        console.error('Confetti function is not defined. Ensure confetti library is loaded.');
    }
}

function incrementDailyVisits() {
    const visitKey = 'dailyVisits';
    const lastVisitDateKey = 'lastVisitDate';
    const currentDate = new Date().toDateString();

    // Retrieve the last visit date and daily visits count from localStorage
    const lastVisitDate = localStorage.getItem(lastVisitDateKey);
    let dailyVisits = parseInt(localStorage.getItem(visitKey), 10) || 0;

    // Check if today's date is different from the last visit date
    if (currentDate !== lastVisitDate) {
        localStorage.setItem(lastVisitDateKey, currentDate); // Update the last visit date
        localStorage.setItem(visitKey, dailyVisits + 1); // Increment the daily visits count
    }
}

function updateVisitCounterDisplay() {
    const visitKey = 'dailyVisits';
    let dailyVisits = parseInt(localStorage.getItem(visitKey), 10) || 0;
    const visitCounterElement = document.getElementById('visit-counter-purple');
    const visitCounterElement2 = document.getElementById('visit-counter-green');

    // Update the visit counter display
    if (visitCounterElement) {
        visitCounterElement.textContent = `${dailyVisits}/5`;
        visitCounterElement2.textContent = `${dailyVisits}/10`;
    }
}

function updateThemeCounterDisplay() {
    const visitCounterElement = document.getElementById('theme-counter-shaded');

    // Update the visit counter display
    if (visitCounterElement) {
        visitCounterElement.textContent = `Themes Unlocked: ${getAllUnlockedThemes()}/10`;
    }
}

function checkVisitsAndUnlockTheme(theme) {
    const visitKey = 'dailyVisits';
    const themeUnlockedKey = `themeUnlocked-${theme}`;
    let dailyVisits = parseInt(localStorage.getItem(visitKey), 10) || 0;
    const feedbackElement = document.getElementById(`feedback-message-${theme}`); // Ensure you have a unique feedback element for each theme

    // If the user has visited the site on 5 different days
    if (dailyVisits >= 5 && theme === "purple") {
        localStorage.setItem(themeUnlockedKey, 'true'); // Unlock the theme
        meepMorp(theme); // Update the UI to reflect the unlocked theme
        runConfetti();
    } else if (dailyVisits >= 10 && theme === "green") {
        localStorage.setItem(themeUnlockedKey, 'true'); // Unlock the theme
        meepMorp(theme); // Update the UI to reflect the unlocked theme
        runConfetti();
    } else {
        // Shake the modal and clear the input
        const modalContent = document.querySelector('.modal-content');
        modalContent.classList.add('shakeThemes');
        setTimeout(() => modalContent.classList.remove('shakeThemes'), 500); // Remove class after animation

        // Clear the input box and show feedback
        if (feedbackElement) feedbackElement.textContent = 'Not enough total visits.';
    }
}

function checkSnowThemeUnlock() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); // Note: January is 0, December is 11
    const feedbackElement = document.getElementById('feedback-message-snow'); // Get the feedback element for snow theme

    // Check if the current month is December
    if (currentMonth === 11) { // 11 represents December
        meepMorp('snow'); // Unlock the snow theme
        runConfetti(); // Run the confetti effect
    } else {
        const modalContent = document.querySelector('.modal-content'); // Assuming this is the modal you want to shake
        modalContent.classList.add('shakeThemes'); // Add shake class to the modal content
        setTimeout(() => modalContent.classList.remove('shakeThemes'), 500); // Remove shake class after 500ms

        if (feedbackElement) feedbackElement.textContent = 'The Snow theme can only be unlocked in December.';
    }
}

function checkNumberOfUnlockedThemesShaded() {
    const feedbackElement = document.getElementById('feedback-message-shaded');

    // If the user has unlocked 10 other themes
    if (getAllUnlockedThemes() >= 10) {
        localStorage.setItem('themeUnlocked-shaded', 'true'); // Unlock the theme
        meepMorp('shaded'); // Update the UI to reflect the unlocked theme
        runConfetti();
    } else {
        // Shake the modal and clear the input
        const modalContent = document.querySelector('.modal-content');
        modalContent.classList.add('shakeThemes');
        setTimeout(() => modalContent.classList.remove('shakeThemes'), 500); // Remove class after animation

        // Clear the input box and show feedback
        if (feedbackElement) feedbackElement.textContent = 'Not enough themes unlocked.';
    }
}

// Counts themes the user has earned (default and dark are free, shaded is the reward itself)
function getAllUnlockedThemes() {
    const notCounted = ['default', 'dark', 'shaded'];
    const unlockedThemes = [];
    // Loop through all the items in localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Check if the key starts with 'themeUnlocked-'
        if (key.startsWith('themeUnlocked-')) {
            // Extract the theme name by removing the prefix
            const themeName = key.replace('themeUnlocked-', '');
            // Optionally, check if the theme is marked as true/unlocked
            if (localStorage.getItem(key) === 'true' && !notCounted.includes(themeName)) {
                unlockedThemes.push(themeName);
            }
        }
    }
    return unlockedThemes.length;
}

function getYesterdayDateString() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toDateString();
}

function checkConsecutiveVisits() {
    const visitKey = 'consecutiveVisits';
    const lastVisitDateKey = 'lastVisitDateMidnight';
    const currentDate = new Date().toDateString();

    // Retrieve the last visit date and consecutive visits count from localStorage
    const lastVisitDate = localStorage.getItem(lastVisitDateKey);
    let consecutiveVisits = parseInt(localStorage.getItem(visitKey), 10) || 0;

    if (currentDate === lastVisitDate) {
        // If the user has already visited today, do nothing
        return;
    }

    if (getYesterdayDateString() === lastVisitDate) {
        // If the user visited yesterday, increment the consecutive visits count
        consecutiveVisits++;
    } else {
        // If not, reset the consecutive visits count
        consecutiveVisits = 1;
    }

    // Save the current date and the updated consecutive visits count
    localStorage.setItem(lastVisitDateKey, currentDate);
    localStorage.setItem(visitKey, consecutiveVisits);
}

function updateConsecutiveVisitCounterDisplay() {
    const visitKey = 'consecutiveVisits';
    const consecutiveVisits = parseInt(localStorage.getItem(visitKey), 10) || 1;
    const visitCounterElement = document.getElementById('consecutive-visit-counter-midnight');
    const visitCounterElement2 = document.getElementById('consecutive-visit-counter-gradient');
    const visitCounterElement3 = document.getElementById('consecutive-visit-counter');

    // Update the visit counter display
    if (visitCounterElement) {
        visitCounterElement.textContent = `Consecutive visits: ${consecutiveVisits}/2`;
        visitCounterElement2.textContent = `Consecutive visits: ${consecutiveVisits}/4`;
        visitCounterElement3.textContent = `Current Streak: ${consecutiveVisits} Days`;
    }
}

function checkConsecutiveVisitsAndUnlockTheme(theme) {
    const visitKey = 'consecutiveVisits';
    const themeUnlockedKey = `themeUnlocked-${theme}`;
    let consecutiveVisits = parseInt(localStorage.getItem(visitKey), 10) || 0;
    const feedbackElement = document.getElementById(`feedback-message-${theme}`); // Ensure you have a unique feedback element for each theme

    // If the user has visited the site on 2 consecutive days
    if (consecutiveVisits >= 2 && theme === "midnight") {
        localStorage.setItem(themeUnlockedKey, 'true'); // Unlock the theme
        meepMorp(theme); // Update the UI to reflect the unlocked theme
        runConfetti(); // Run the confetti effect
    } else if (consecutiveVisits >= 4 && theme === "gradient") {
        localStorage.setItem(themeUnlockedKey, 'true'); // Unlock the theme
        meepMorp(theme); // Update the UI to reflect the unlocked theme
        runConfetti(); // Run the confetti effect
    } else {
        // Shake the modal and clear the input
        const modalContent = document.querySelector('.modal-content');
        modalContent.classList.add('shakeThemes');
        // Provide feedback
        if (feedbackElement) feedbackElement.textContent = 'Not enough days visited consecutively.';

        // Remove the shake class after the animation completes
        setTimeout(() => {
            modalContent.classList.remove('shakeThemes');
        }, 500);
    }
}

// Mark a theme as unlocked without switching to it
function unlockTheme(theme) {
    localStorage.setItem(`themeUnlocked-${theme}`, true);
    document.querySelector(`.theme-button[data-theme="${theme}"]`).classList.remove('locked-theme');
    updateThemeCounterDisplay();
}

function meepMorp(theme) {
    unlockTheme(theme);
    // Games opened from the Games menu are played for fun: keep the game and current theme
    if (document.getElementById('puzzleModal').classList.contains('game-mode')) return;
    closePuzzle();
    updateThemeCounterDisplay();
    switchTheme(theme); // Switch to the newly unlocked theme
    setActiveButton(theme); // Set the newly unlocked theme button as active
}

function resetUnlockedThemes() {
    const themeButtons = document.querySelectorAll('.theme-button:not([data-theme="default"]):not([data-theme="dark"])');
    themeButtons.forEach(button => {
        const theme = button.getAttribute('data-theme');
        localStorage.removeItem(`themeUnlocked-${theme}`);
        button.classList.add('locked-theme');
        button.classList.remove('unlocked');
    });
    switchTheme('default'); // Reset to default theme
    setActiveButton('default'); // Set default theme button as active
}

function attachEventListenerToThemeSelector() {
    const selectorButton = document.getElementById('theme_selector');
    // Ensure the button exists before adding an event listener
    if (selectorButton) {
        selectorButton.addEventListener('click', openSelector);
    }

    // Add event listener to close the selector if clicking outside
    document.addEventListener('click', function(event) {
        const selectorMenu = document.getElementById('themes_selector');
        const puzzleModal = document.getElementById('puzzleModal');
        if (puzzleModal.style.display === 'block') return; // the puzzle closes via its own backdrop/close button
        const clickedInsideSelector = selectorMenu.contains(event.target) || puzzleModal.contains(event.target) || selectorButton.contains(event.target);
        // A game may replace the clicked element while handling the click; that's not an outside click
        const targetWasRemoved = !document.body.contains(event.target);

        if (!clickedInsideSelector && !targetWasRemoved) {
            closeSelector();
        }
    });
}

function openSelector() {
    const selectorMenu = document.getElementById('themes_selector');
    selectorMenu.classList.remove('hidden'); // Use classList for adding/removing classes

    const blur = document.getElementById('themes_blur');
    blur.classList.remove('hidden');
}

function closeSelector() {
    const selectorMenu = document.getElementById('themes_selector');
    selectorMenu.classList.add('hidden');

    const blur = document.getElementById('themes_blur');
    blur.classList.add('hidden');

    const modal = document.getElementById('puzzleModal');
    modal.style.display = 'none';
    modal.classList.remove('game-mode');
    document.body.classList.remove('modal-open');
}

function attachEventListenerToModal() {
    window.onclick = function(event) {
        if (event.target === document.getElementById('puzzleModal')) {
            closePuzzle();
        }
    };

    const closeButton = document.getElementById('puzzleModal').querySelector('.close');
    closeButton.addEventListener('click', closePuzzle);
}

// Define the game variable in a higher scope
var game;

function checkSpaceThemeUnlock() {
    const feedbackElement = document.getElementById('feedback-message-space'); // Get the feedback element for snow theme

    if (game.in_checkmate() && game.turn() === 'b') {
        meepMorp('space'); // Update the UI to reflect the unlocked theme
        runConfetti(); // Run the confetti effect
    } else {
        const modalContent = document.querySelector('.modal-content'); // Assuming this is the modal you want to shake
        modalContent.classList.add('shakeThemes'); // Add shake class to the modal content
        setTimeout(() => modalContent.classList.remove('shakeThemes'), 500); // Remove shake class after 500ms

        if (feedbackElement) feedbackElement.textContent = 'You must checkmate your opponent to unlock this theme.';

    }
}
var chessBoard; // chessboard.js UI instance (resized when the puzzle opens)

$(document).ready(function() {

    game = new Chess();
    var engineThinking = false;
    var statusElement = document.getElementById('feedback-message-space');

    // ---- Engine tuning (targets roughly 1000 Elo) ----
    // A shallow search with full captures sees simple tactics (free pieces,
    // mate in one) but misses deeper combinations. Small random noise and an
    // occasional "good but not best" move make it play like a club beginner.
    var SEARCH_DEPTH = 2;          // plies of full search (engine move + reply)
    var QUIESCENCE_DEPTH = 4;      // extra plies of captures only
    var EVAL_NOISE = 40;           // +/- centipawns of randomness per root move
    var INACCURACY_CHANCE = 0.15;  // chance to pick a weaker reasonable move
    var INACCURACY_MARGIN = 120;   // how much worse (centipawns) that move may be
    var MATE_SCORE = 100000;

    var PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

    // Piece-square tables from white's point of view (row 0 = rank 8)
    var PST = {
        p: [
            [ 0,  0,  0,  0,  0,  0,  0,  0],
            [50, 50, 50, 50, 50, 50, 50, 50],
            [10, 10, 20, 30, 30, 20, 10, 10],
            [ 5,  5, 10, 25, 25, 10,  5,  5],
            [ 0,  0,  0, 20, 20,  0,  0,  0],
            [ 5, -5,-10,  0,  0,-10, -5,  5],
            [ 5, 10, 10,-20,-20, 10, 10,  5],
            [ 0,  0,  0,  0,  0,  0,  0,  0]
        ],
        n: [
            [-50,-40,-30,-30,-30,-30,-40,-50],
            [-40,-20,  0,  0,  0,  0,-20,-40],
            [-30,  0, 10, 15, 15, 10,  0,-30],
            [-30,  5, 15, 20, 20, 15,  5,-30],
            [-30,  0, 15, 20, 20, 15,  0,-30],
            [-30,  5, 10, 15, 15, 10,  5,-30],
            [-40,-20,  0,  5,  5,  0,-20,-40],
            [-50,-40,-30,-30,-30,-30,-40,-50]
        ],
        b: [
            [-20,-10,-10,-10,-10,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0,  5, 10, 10,  5,  0,-10],
            [-10,  5,  5, 10, 10,  5,  5,-10],
            [-10,  0, 10, 10, 10, 10,  0,-10],
            [-10, 10, 10, 10, 10, 10, 10,-10],
            [-10,  5,  0,  0,  0,  0,  5,-10],
            [-20,-10,-10,-10,-10,-10,-10,-20]
        ],
        r: [
            [ 0,  0,  0,  0,  0,  0,  0,  0],
            [ 5, 10, 10, 10, 10, 10, 10,  5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [ 0,  0,  0,  5,  5,  0,  0,  0]
        ],
        q: [
            [-20,-10,-10, -5, -5,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0,  5,  5,  5,  5,  0,-10],
            [ -5,  0,  5,  5,  5,  5,  0, -5],
            [  0,  0,  5,  5,  5,  5,  0, -5],
            [-10,  5,  5,  5,  5,  5,  0,-10],
            [-10,  0,  5,  0,  0,  0,  0,-10],
            [-20,-10,-10, -5, -5,-10,-10,-20]
        ],
        k: [
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-20,-30,-30,-40,-40,-30,-30,-20],
            [-10,-20,-20,-20,-20,-20,-20,-10],
            [ 20, 20,  0,  0,  0,  0, 20, 20],
            [ 20, 30, 10,  0,  0, 10, 30, 20]
        ]
    };

    // Static evaluation from the side to move's point of view
    // (chess.js 0.10.2 has no board() method, so read the FEN placement field)
    function evaluate() {
        var placement = game.fen().split(' ')[0];
        var score = 0;
        var r = 0, c = 0;
        for (var i = 0; i < placement.length; i++) {
            var ch = placement.charAt(i);
            if (ch === '/') {
                r++;
                c = 0;
            } else if (ch >= '1' && ch <= '8') {
                c += parseInt(ch, 10);
            } else {
                var type = ch.toLowerCase();
                if (ch !== type) {
                    score += PIECE_VALUES[type] + PST[type][r][c];
                } else {
                    score -= PIECE_VALUES[type] + PST[type][7 - r][c];
                }
                c++;
            }
        }
        return game.turn() === 'w' ? score : -score;
    }

    // Order moves so alpha-beta prunes well: promotions and good captures first
    function moveOrderScore(move) {
        var score = 0;
        if (move.captured) score += 10 * PIECE_VALUES[move.captured] - PIECE_VALUES[move.piece];
        if (move.promotion) score += PIECE_VALUES[move.promotion];
        return score;
    }

    function orderedMoves(movesList) {
        return movesList.sort(function(a, b) { return moveOrderScore(b) - moveOrderScore(a); });
    }

    // Only look at captures so the engine doesn't stop mid-exchange
    function quiescence(alpha, beta, depth) {
        var standPat = evaluate();
        if (depth === 0 || standPat >= beta) return standPat;
        if (standPat > alpha) alpha = standPat;

        var captures = orderedMoves(game.moves({ verbose: true }).filter(function(m) {
            return m.captured || m.promotion;
        }));

        for (var i = 0; i < captures.length; i++) {
            game.move(captures[i]);
            var score = -quiescence(-beta, -alpha, depth - 1);
            game.undo();
            if (score >= beta) return score;
            if (score > alpha) alpha = score;
        }
        return alpha;
    }

    function negamax(depth, alpha, beta, ply) {
        var movesList = game.moves({ verbose: true });

        if (movesList.length === 0) {
            // Prefer faster mates and slower losses
            return game.in_check() ? -MATE_SCORE + ply : 0;
        }
        if (game.insufficient_material()) return 0;
        if (depth === 0) return quiescence(alpha, beta, QUIESCENCE_DEPTH);

        var best = -Infinity;
        orderedMoves(movesList);
        for (var i = 0; i < movesList.length; i++) {
            game.move(movesList[i]);
            var score = -negamax(depth - 1, -beta, -alpha, ply + 1);
            game.undo();
            if (score > best) best = score;
            if (score > alpha) alpha = score;
            if (alpha >= beta) break;
        }
        return best;
    }

    function chooseEngineMove() {
        var movesList = orderedMoves(game.moves({ verbose: true }));
        var scored = [];

        // Score every root move with a full window so the scores can be compared
        for (var i = 0; i < movesList.length; i++) {
            game.move(movesList[i]);
            var score = -negamax(SEARCH_DEPTH - 1, -Infinity, Infinity, 1);
            game.undo();
            scored.push({ move: movesList[i], score: score });
        }

        scored.sort(function(a, b) { return b.score - a.score; });
        var bestScore = scored[0].score;

        // Never miss a forced mate it can see
        if (bestScore > MATE_SCORE / 2) return scored[0].move;

        // Occasionally play a slightly worse (but not losing) move
        if (Math.random() < INACCURACY_CHANCE) {
            var reasonable = scored.filter(function(s) {
                return s.score >= bestScore - INACCURACY_MARGIN && s.score > -MATE_SCORE / 2;
            });
            if (reasonable.length > 0) {
                return reasonable[Math.floor(Math.random() * reasonable.length)].move;
            }
        }

        // Otherwise pick the best move after adding a little noise
        var choice = scored[0];
        var choiceScore = -Infinity;
        scored.forEach(function(s) {
            if (s.score < -MATE_SCORE / 2) return;
            var noisy = s.score + (Math.random() * 2 - 1) * EVAL_NOISE;
            if (noisy > choiceScore) {
                choiceScore = noisy;
                choice = s;
            }
        });
        return choice.move;
    }

    function makeEngineMove() {
        if (!game.game_over()) {
            game.move(chooseEngineMove());
            chessBoard.position(game.fen());
        }
        engineThinking = false;
        updateStatus();
    }

    function onDragStart(source, piece) {
        // Player is white; block moves while the engine is thinking or the game is over
        if (game.game_over() || engineThinking || game.turn() !== 'w' || piece.search(/^b/) !== -1) {
            return false;
        }
    }

    function onDrop(source, target) {
        var move = game.move({
            from: source,
            to: target,
            promotion: 'q' // NOTE: Always promote to a queen for simplicity
        });

        if (move === null) return 'snapback';

        updateStatus();
        if (!game.game_over()) {
            engineThinking = true;
            // Let the board finish animating before the search blocks the page
            window.setTimeout(makeEngineMove, 250);
        }
    }

    function onSnapEnd() {
        chessBoard.position(game.fen());
    }

    function setStatus(text) {
        if (statusElement) statusElement.textContent = text;
    }

    function updateStatus() {
        if (game.in_checkmate()) {
            if (game.turn() === 'b') {
                setStatus('Checkmate! You win!');
                checkSpaceThemeUnlock();
            } else {
                setStatus('Checkmate. You lost - press Start New Game to try again.');
            }
        } else if (game.in_draw()) {
            setStatus('Draw. Press Start New Game to try again.');
        } else if (game.in_check()) {
            setStatus(game.turn() === 'w' ? 'You are in check!' : 'Check! Thinking...');
        } else {
            setStatus(game.turn() === 'w' ? 'Your move (white).' : 'Thinking...');
        }
    }

    chessBoard = Chessboard('chessboard', {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd
    });
    updateStatus();

    document.getElementById('startBtn').addEventListener('click', function () {
        if (engineThinking) return;
        game.reset();
        chessBoard.start();
        updateStatus();
    });
});

function initialize2048 (){
    const container = document.getElementById('game2048-container-magma');
    let board = generateEmptyBoard();
    let won = false; // only unlock once per game

    function generateEmptyBoard() {
        return [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    }

    document.addEventListener('keydown', handleKeyPress);

    function handleKeyPress(e) {
        // Only play while the 2048 puzzle is open
        const modalOpen = document.getElementById('puzzleModal').style.display === 'block';
        if (!modalOpen || document.getElementById('puzzle-magma').style.display !== 'block') return;

        let boardChanged = false;
        let originalBoard = JSON.parse(JSON.stringify(board)); // Deep copy of the board for comparison

        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault(); // don't scroll the page
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                board = transposeBoard(board); // Transpose for vertical movements
            }

            board.forEach((row, index) => {
                let originalRow = [...row]; // Copy the original row/column for comparison

                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    board[index] = moveTilesLeft(row);
                } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    board[index] = moveTilesRight(row);
                }

                if (!originalRow.every((val, idx) => val === board[index][idx])) {
                    boardChanged = true; // The row/column changed
                }
            });

            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                board = transposeBoard(board); // Transpose back after vertical movements
            }

            if (boardChanged) {
                addRandomTile(board);
                drawBoard();
                if (!won && checkWinCondition()) {
                    won = true;
                    runConfetti();
                    meepMorp('magma');
                }
            }
        }
    }

    function moveTilesLeft(row) {
        let newRow = row.filter(val => val !== 0); // Remove zeros
        for (let i = 0; i < newRow.length - 1; i++) { // Combine tiles
            if (newRow[i] === newRow[i + 1]) {
                newRow[i] *= 2;
                newRow.splice(i + 1, 1); // Remove combined tile
                newRow.push(0); // Add zero at the end
            }
        }
        while (newRow.length < 4) { // Ensure row length is 4
            newRow.push(0);
        }
        return newRow;
    }

    function moveTilesRight(row) {
        row.reverse(); // Reverse to use the moveTilesLeft logic
        let newRow = moveTilesLeft(row);
        newRow.reverse(); // Reverse back to original order
        return newRow;
    }

    function addRandomTile(board) {
        let emptyTiles = [];
        board.forEach((row, rowIndex) => {
            row.forEach((cell, cellIndex) => {
                if (cell === 0) emptyTiles.push([rowIndex, cellIndex]);
            });
        });
        if (emptyTiles.length > 0) {
            let [row, col] = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
            board[row][col] = Math.random() > 0.9 ? 4 : 2;
        }
    }

    function drawBoard() {
        container.innerHTML = ''; // Clear previous tiles
        const tileSize = 4; // Adjust based on your CSS
        const tileGap = 0.5;  // Adjust based on your CSS
        board.forEach((row, rowIndex) => {
            row.forEach((cellValue, colIndex) => {
                const tile = document.createElement('div');
                tile.className = 'game-tile';
                tile.textContent = cellValue || '';
                tile.style.top = `${(tileSize + tileGap) * rowIndex}vw`;
                tile.style.left = `${(tileSize + tileGap) * colIndex}vw`;
                tile.style.backgroundColor = getTileColor(cellValue);
                container.appendChild(tile);
            });
        });
    }

    function getTileColor(value) {
        const colorMap = {
            2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563',
            32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61',
            512: '#edc850'
        };
        return colorMap[value] || '#cdc1b4';
    }

    function checkWinCondition() {
        return board.some(row => row.some(cell => cell === 1024));
    }

    function transposeBoard(board) {
        return board[0].map((_, colIndex) => board.map(row => row[colIndex]));
    }


    document.getElementById('startBtnMagma').addEventListener('click', function () {
        board = board.map(row => row.map(() => 0)); // Reset each tile to 0
        won = false;
        addRandomTile(board);
        addRandomTile(board); // Add two random tiles
        drawBoard(); // Redraw the board
    });

    // Initialization
    addRandomTile(board);
    addRandomTile(board);
    drawBoard();
}

