
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Redirection middleware to remove 'www.'
app.use((req, res, next) => {
    if (req.headers.host.slice(0, 4) === 'www.') {
        const newHost = req.headers.host.slice(4);
        return res.redirect(301, `https://${newHost}${req.originalUrl}`);
    }
    next();
});

// Specific route for /calendar
app.get('/calendar', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/calendar.html'));
});

// Specific route for /clubs
app.get('/clubs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/clubs.html'));
});

// Specific route for /account
// app.get('/account', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public/html/account.html'));
// });

// Specific route for /info
app.get('/info', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/info.html'));
});
// Specific route for /gpa
app.get('/gpa', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/gpa.html'));
});
// Redirect /kart to an external URL
app.get('/kart', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Redirecting…</title>
</head>

<body>
    <script>
        localStorage.setItem('redirectedFromKart', 'true');
        window.location.href = 'https://mkpc.malahieude.net/mariokart.php';
    </script>
    <p>Redirecting…</p>
</body>

</html>`);
});

// Catch-all route to handle all other requests and return the index.html file
app.get('*', (req, res) => {
    if (path.extname(req.path).length > 0) {
        res.status(404).end();
    } else {
        res.sendFile(path.join(__dirname, 'public/index.html'));
    }
});

const { exec } = require('child_process');

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
