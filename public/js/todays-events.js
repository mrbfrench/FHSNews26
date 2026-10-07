// "Events" dropdown on the home page: lists today's Fishers High School events
// from the calendar data (written by scripts/update-calendar.js).

(function () {
    var SCHOOL_FOLDER = '19-fishers-high-school';

    function todayParts() {
        var now = new Date();
        return {
            yearMonth: now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'),
            day: String(now.getDate()),
            label: now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
        };
    }

    function addMessage(list, text) {
        var item = document.createElement('li');
        item.className = 'events-empty';
        item.textContent = text;
        list.appendChild(item);
    }

    function render(list, events) {
        list.innerHTML = '';
        events = events.filter(function (e) { return e && e.title; });
        if (events.length === 0) {
            addMessage(list, 'No events today.');
            return;
        }

        events.forEach(function (event) {
            var item = document.createElement('li');
            var title = event.title.toLowerCase();
            if (title === 'red day') item.className = 'events-red-day';
            if (title === 'silver day') item.className = 'events-silver-day';

            var name = document.createElement('strong');
            name.textContent = event.title;
            item.appendChild(name);

            // "All Day" adds nothing for an event with no time
            var details = [event.time !== 'All Day' ? event.time : null, event.location].filter(Boolean);
            if (details.length) {
                var info = document.createElement('span');
                info.textContent = details.join(' · ');
                item.appendChild(info);
            }
            list.appendChild(item);
        });
    }

    function loadEvents(list) {
        var today = todayParts();
        document.getElementById('events_date').textContent = today.label;
        list.innerHTML = '';
        addMessage(list, 'Loading...');

        fetch('py/calendar/calendar-data/' + SCHOOL_FOLDER + '/' + today.yearMonth + '.json')
            .then(function (response) {
                if (!response.ok) throw new Error(response.status);
                return response.json();
            })
            .then(function (data) {
                render(list, data[today.day] || []);
            })
            .catch(function () {
                list.innerHTML = '';
                addMessage(list, "Couldn't load today's events.");
            });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var button = document.getElementById('events_selector');
        var dropdown = document.getElementById('events_dropdown');
        var list = document.getElementById('events_list');
        if (!button || !dropdown) return;

        button.addEventListener('click', function (event) {
            event.stopPropagation();
            document.getElementById('games_dropdown').classList.add('hidden');
            dropdown.classList.toggle('hidden');
            // Reload each time so the list stays right if the page is left open overnight
            if (!dropdown.classList.contains('hidden')) loadEvents(list);
        });

        // Clicking inside the list keeps it open; clicking anywhere else closes it
        dropdown.addEventListener('click', function (event) { event.stopPropagation(); });
        document.addEventListener('click', function () { dropdown.classList.add('hidden'); });
    });
})();
