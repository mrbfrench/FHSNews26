//New method for rendering and displaying clubs. Use this file over clubs.js

const auth = firebase.auth();
const db = firebase.firestore();

let clubs = [];
let currentUser = null;
let userFavorites = [];

const LOCAL_FAVORITES_KEY = 'favorites';

if (!firebase.apps.length) {
    console.error("Firebase not initialized! Make sure firebase-config.js is loaded before club.js");
}

async function loadClubs() {
    try {
        const response = await fetch("clubs.json");
        if (!response.ok) throw new Error(`Failed to load clubs: ${response.status}`);
        
        clubs = await response.json();

        clubs.sort((a, b) => {
            const nameA = a.club.toLowerCase();
            const nameB = b.club.toLowerCase();

            const Astart = /^\d/.test(nameA);
            const Bstart = /^\d/.test(nameB);

            if (Astart && !Bstart) return -1;
            if (!Astart && Bstart) return 1;
            return nameA.localeCompare(nameB);
        });

        createClubs();
    } catch (error) {
        console.error("Error loading clubs:", error);
        const clubList = document.getElementById("clubList");
        if (clubList) {
            clubList.innerHTML = "<p class='no-results'>Failed to load clubs. Please try again later.</p>";
        }
    }
}

async function loadUserFavorites() {
    if (!auth.currentUser) {
        userFavorites = getLocalFavorites();
        return;
    }

    try {
        const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();

        if (userDoc.exists) {
            userFavorites = userDoc.data().favorites || [];
            saveLocalFavorites(userFavorites);
        } else {
            userFavorites = [];
            saveLocalFavorites([]);
        }

        syncLocalFavoritesToFirebase();

        if (document.getElementById("clubList")) {
            createClubs();
        }

    } catch (error) {
        console.error("Error loading favorites:", error);
        userFavorites = getLocalFavorites();
    }
}

function getLocalFavorites() {
    try {
        const favorites = localStorage.getItem(LOCAL_FAVORITES_KEY);
        return favorites ? JSON.parse(favorites) : [];
    } catch (error) {
        console.error("Error reading local favorites:", error);
        return [];
    }
}

function saveLocalFavorites(favorites) {
    try {
        localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify(favorites));
    } catch (error) {
        console.error("Error saving local favorites:", error);
    }
}

function updateLocalFavorites(club, action) {
    let localFavorites = getLocalFavorites();

    if (action === 'add') {
        if (!localFavorites.some(fav => fav.club === club.club)) {
            localFavorites.push(club);
        }
    } else if (action === 'remove') {
        localFavorites = localFavorites.filter(fav => fav.club !== club.club);
    }

    saveLocalFavorites(localFavorites);
    return localFavorites;
}

async function syncLocalFavoritesToFirebase() {
    if (!auth.currentUser) return;

    const localFavorites = getLocalFavorites();
    if (localFavorites.length === 0) return;

    try {
        const userRef = db.collection('users').doc(auth.currentUser.uid);
        const userDoc = await userRef.get();

        let currentFavorites = [];
        if (userDoc.exists) {
            currentFavorites = userDoc.data().favorites || [];
        }

        const mergedFavorites = [...currentFavorites];
        localFavorites.forEach(localFav => {
            if (!mergedFavorites.some(fav => fav.club === localFav.club)) {
                mergedFavorites.push(localFav);
            }
        });

        await userRef.set({
            favorites: mergedFavorites
        }, { merge: true });

        saveLocalFavorites(mergedFavorites);
        console.log("Local favorites synced to Firebase");
    } catch (error) {
        console.error("Error syncing favorites:", error);
    }
}

function createClubs() {
    const clubList = document.getElementById("clubList");
    if (!clubList) return;

    clubList.innerHTML = "";

    const selectedTypes = [];
    const selectedTimes = [];
    const selectedDays = [];

    if (document.getElementById("checkboxAcademic").checked) selectedTypes.push("Academic");
    if (document.getElementById("checkboxService").checked) selectedTypes.push("Service");
    if (document.getElementById("checkboxSports").checked) selectedTypes.push("Sports");
    if (document.getElementById("checkboxArt").checked) selectedTypes.push("Arts");
    if (document.getElementById("checkboxGames").checked) selectedTypes.push("Games");

    if (document.getElementById("checkboxBefore").checked) selectedTimes.push("Before");
    if (document.getElementById("checkboxAfter").checked) selectedTimes.push("After");

    if (document.getElementById("checkboxMonday").checked) selectedDays.push("Monday");
    if (document.getElementById("checkboxTuesday").checked) selectedDays.push("Tuesday");
    if (document.getElementById("checkboxWednesday").checked) selectedDays.push("Wednesday");
    if (document.getElementById("checkboxThursday").checked) selectedDays.push("Thursday");
    if (document.getElementById("checkboxFriday").checked) selectedDays.push("Friday");
    if (document.getElementById("checkboxWeekend").checked) selectedDays.push("Weekend");

    const anyFilters = selectedTypes.length || selectedTimes.length || selectedDays.length;

    // Filter clubs
    const filteredClubs = anyFilters
        ? clubs.filter(club =>
            (selectedTypes.length === 0 || selectedTypes.includes(club.Type)) &&
            (selectedTimes.length === 0 || selectedTimes.includes(club.Time)) &&
            (selectedDays.length === 0 || selectedDays.includes(club.Day))
        )
        : clubs.slice();

    if (filteredClubs.length === 0) {
        clubList.innerHTML = "<p class='no-results'>No clubs found.</p>";
        return;
    }

    filteredClubs.forEach(club => {
        const liElement = document.createElement("li");
        liElement.classList.add("club-box");

        liElement.innerHTML = `
            <img 
                src="star.png" 
                alt="favorite star" 
                class="favorite-star" 
                style="width:25px; height:25px; cursor:pointer;"
                data-club="${club.club}"
            >
            <h3 class="clubBoxesFontSize">${club.club}</h3>
            <p class="clubBoxesFontSize">${club.staff}</p>
            <p class="clubBoxesEmailSize">${club.email}</p>
        `;

        const star = liElement.querySelector(".favorite-star");

        // Check if club is favorited
        const isFavorited = userFavorites.some(fav => fav.club === club.club);
        if (isFavorited) {
            star.src = "goldStar.jpeg";
            star.classList.add("favorited");
        }

        star.addEventListener("click", async (e) => {
            e.stopPropagation();
            const target = e.target;

            if (!auth.currentUser) {
                target.classList.toggle("favorited");

                if (target.classList.contains("favorited")) {
                    target.src = "goldStar.jpeg";
                    // Save ALL club data to localStorage
                    userFavorites = updateLocalFavorites({
                        club: club.club,
                        staff: club.staff,
                        email: club.email,
                        Type: club.Type,
                        Time: club.Time,
                        Day: club.Day,
                        description: club.description || "No description available."
                    }, 'add');
                } else {
                    target.src = "star.png";
                    userFavorites = updateLocalFavorites(club, 'remove');
                }
                return;
            }

            target.classList.toggle("favorited");

            try {
                const userRef = db.collection('users').doc(auth.currentUser.uid);

                if (target.classList.contains("favorited")) {
                    target.src = "goldStar.jpeg";

                    await userRef.set({
                        favorites: firebase.firestore.FieldValue.arrayUnion({
                            club: club.club,
                            staff: club.staff,
                            email: club.email,
                            Type: club.Type,
                            Time: club.Time,
                            Day: club.Day,
                            description: club.description || "No description available."
                        })
                    }, { merge: true });

                } else {
                    target.src = "star.png";

                    await userRef.set({
                        favorites: firebase.firestore.FieldValue.arrayRemove({
                            club: club.club,
                            staff: club.staff,
                            email: club.email,
                            Type: club.Type,
                            Time: club.Time,
                            Day: club.Day,
                            description: club.description || "No description available."
                        })
                    }, { merge: true });
                }

                await loadUserFavorites();

            } catch (error) {
                console.error("Error updating favorites:", error);
                alert("Error saving favorite. Please try again.");
                target.classList.toggle("favorited");
            }
        });

        liElement.addEventListener("click", () => {
            const overlayTitle = document.getElementById("overlayTitle");
            const overlayStaff = document.getElementById("overlayStaff");
            const overlayEmail = document.getElementById("overlayEmail");
            const overlayTime = document.getElementById("overlayTime");
            const overlayType = document.getElementById("overlayType");
            const overlayDays = document.getElementById("overlayDays");
            const overlayDescription = document.getElementById("overlayDescription");
            const overlay = document.getElementById("descriptionOverlay");

            if (overlayTitle) overlayTitle.textContent = club.club || "No title available";
            if (overlayStaff) overlayStaff.textContent = `Staff: ${club.staff || "Not available"}`;
            if (overlayEmail) overlayEmail.textContent = `Email: ${club.email || "Not available"}`;

            let timeText = `Time: ${club.Time || "Not available"}`;
            if (club.Time) timeText += " School";

            if (overlayTime) overlayTime.textContent = timeText;
            if (overlayType) overlayType.textContent = `Type: ${club.Type || "Not available"}`;
            if (overlayDays) overlayDays.textContent = `Days: ${club.Day || "Not available"}`;
            if (overlayDescription) overlayDescription.textContent = club.description || "No description available.";

            if (overlay) {
                overlay.classList.remove("hidden");
            }
        });

        clubList.appendChild(liElement);
    });
}

function showFavoritesOnly() {
    const clubList = document.getElementById("clubList");
    if (!clubList) return;

    clubList.innerHTML = "";

    if (userFavorites.length === 0) {
        clubList.innerHTML = "<p class='no-results'>No favorites saved yet.</p>";
        return;
    }

    userFavorites.forEach(favClub => {
        const liElement = document.createElement("li");
        liElement.classList.add("club-box");

        liElement.innerHTML = `
            <img 
                src="goldStar.jpeg" 
                alt="favorite star" 
                class="favorite-star favorited" 
                style="width:25px; height:25px; cursor:pointer;"
                data-club="${favClub.club}"
            >
            <h3 class="clubBoxesFontSize">${favClub.club}</h3>
            <p class="clubBoxesFontSize">${favClub.staff}</p>
            <p class="clubBoxesEmailSize">${favClub.email}</p>
        `;

        const star = liElement.querySelector(".favorite-star");

        star.addEventListener("click", async (e) => {
            e.stopPropagation();
            const target = e.target;

            if (!auth.currentUser) {
                target.src = "star.png";
                target.classList.remove("favorited");
                userFavorites = updateLocalFavorites(favClub, 'remove');

                showFavoritesOnly();
                return;
            }

            try {
                const userRef = db.collection('users').doc(auth.currentUser.uid);

                target.src = "star.png";
                target.classList.remove("favorited");

                await userRef.set({
                    favorites: firebase.firestore.FieldValue.arrayRemove({
                        club: favClub.club,
                        staff: favClub.staff,
                        email: favClub.email,
                        Type: favClub.Type,
                        Time: favClub.Time,
                        Day: favClub.Day,
                        description: favClub.description || "No description available."
                    })
                }, { merge: true });

                await loadUserFavorites();
                showFavoritesOnly();

            } catch (error) {
                console.error("Error removing favorite:", error);
                alert("Error removing favorite. Please try again.");
            }
        });

        liElement.addEventListener("click", () => {
            const overlayTitle = document.getElementById("overlayTitle");
            const overlayStaff = document.getElementById("overlayStaff");
            const overlayEmail = document.getElementById("overlayEmail");
            const overlayTime = document.getElementById("overlayTime");
            const overlayType = document.getElementById("overlayType");
            const overlayDays = document.getElementById("overlayDays");
            const overlayDescription = document.getElementById("overlayDescription");
            const overlay = document.getElementById("descriptionOverlay");

            if (overlayTitle) overlayTitle.textContent = favClub.club || "No title available";
            if (overlayStaff) overlayStaff.textContent = `Staff: ${favClub.staff || "Not available"}`;
            if (overlayEmail) overlayEmail.textContent = `Email: ${favClub.email || "Not available"}`;

            let timeText = `Time: ${favClub.Time || "Not available"}`;
            if (favClub.Time) timeText += " School";

            if (overlayTime) overlayTime.textContent = timeText;
            if (overlayType) overlayType.textContent = `Type: ${favClub.Type || "Not available"}`;
            if (overlayDays) overlayDays.textContent = `Days: ${favClub.Day || "Not available"}`;
            if (overlayDescription) overlayDescription.textContent = favClub.description || "No description available.";

            if (overlay) {
                overlay.classList.remove("hidden");
            }
        });

        clubList.appendChild(liElement);
    });
}

async function renderFavorites() {
    const favoriteList = document.getElementById("favoriteList");
    if (!favoriteList) return;

    // Load clubs data to get full descriptions
    let allClubs = [];
    try {
        const response = await fetch("clubs.json");
        if (response.ok) {
            allClubs = await response.json();
        }
    } catch (error) {
        console.error("Error loading clubs for favorites page:", error);
    }

    const favorites = getLocalFavorites();
    favoriteList.innerHTML = "";

    if (favorites.length === 0) {
        favoriteList.innerHTML = "<p class='no-results'>No favorites saved yet.</p>";
        return;
    }

    favorites.forEach(fav => {
        // Try to find the full club data from allClubs
        const fullClubData = allClubs.find(club => club.club === fav.club);
        const displayClub = fullClubData || fav; // Use full data if found, otherwise use saved data

        const li = document.createElement("li");
        li.classList.add("club-box");
        li.innerHTML = `
            <img 
                src="goldStar.jpeg" 
                alt="favorite star" 
                class="favorite-star" 
                style="width:25px; height:25px; cursor:pointer;"
            >
            <h3 class="clubBoxesFontSize">${displayClub.club}</h3>
            <p class="clubBoxesFontSize">${displayClub.staff}</p>
            <p class="clubBoxesEmailSize">${displayClub.email}</p>
        `;

        const star = li.querySelector(".favorite-star");
        star.addEventListener("click", (e) => {
            e.stopPropagation();
            let favorites = getLocalFavorites();
            favorites = favorites.filter(f => f.club !== fav.club);
            saveLocalFavorites(favorites);
            renderFavorites();
        });

        li.addEventListener("click", () => {
            const overlayTitle = document.getElementById("overlayTitle");
            const overlayStaff = document.getElementById("overlayStaff");
            const overlayEmail = document.getElementById("overlayEmail");
            const overlayTime = document.getElementById("overlayTime");
            const overlayType = document.getElementById("overlayType");
            const overlayDays = document.getElementById("overlayDays");
            const overlayDescription = document.getElementById("overlayDescription");
            const overlay = document.getElementById("descriptionOverlay");

            if (overlayTitle) overlayTitle.textContent = displayClub.club || "No title available";
            if (overlayStaff) overlayStaff.textContent = `Staff: ${displayClub.staff || "Not available"}`;
            if (overlayEmail) overlayEmail.textContent = `Email: ${displayClub.email || "Not available"}`;

            let timeText = `Time: ${displayClub.Time || "Not available"}`;
            if (displayClub.Time) timeText += " School";

            if (overlayTime) overlayTime.textContent = timeText;
            if (overlayType) overlayType.textContent = `Type: ${displayClub.Type || "Not available"}`;
            if (overlayDays) overlayDays.textContent = `Days: ${displayClub.Day || "Not available"}`;
            if (overlayDescription) overlayDescription.textContent = displayClub.description || "No description available.";

            if (overlay) {
                overlay.classList.remove("hidden");
            }
        });

        favoriteList.appendChild(li);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const clubList = document.getElementById("clubList");
    const favoriteList = document.getElementById("favoriteList");

    if (clubList) {
        loadClubs();

        auth.onAuthStateChanged((user) => {
            currentUser = user;
            loadUserFavorites().then(() => {
                createClubs();
            });
        });

        document.querySelectorAll('input[type=checkbox]').forEach(cb => {
            cb.addEventListener("change", () => {
                localStorage.setItem(cb.id, cb.checked);
                createClubs();
            });

            const saved = localStorage.getItem(cb.id);
            if (saved !== null) cb.checked = saved === "true";
        });

        const overlay = document.getElementById("descriptionOverlay");
        const closeOverlay = document.getElementById("closeOverlay");

        if (closeOverlay) {
            closeOverlay.addEventListener("click", () => {
                if (overlay) overlay.classList.add("hidden");
            });
        }

        if (overlay) {
            overlay.addEventListener("click", (e) => {
                if (e.target === overlay) overlay.classList.add("hidden");
            });
        }
    }

    if (favoriteList) {
        renderFavorites();

        const overlay = document.getElementById("descriptionOverlay");
        const closeOverlay = document.getElementById("closeOverlay");

        if (closeOverlay) {
            closeOverlay.addEventListener("click", () => {
                if (overlay) overlay.classList.add("hidden");
            });
        }

        if (overlay) {
            overlay.addEventListener("click", (e) => {
                if (e.target === overlay) overlay.classList.add("hidden");
            });
        }
    }
});