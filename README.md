# FHSNewsRemastered (FHSNews26)

FHSNews but better

Latest version of schedlink/fhs news

## Run locally (Node.js / npm)

These instructions show how to install Node.js/npm on macOS and run the app using `node server.js`.

1) Install Node.js and npm

- Using Homebrew (recommended if you already have Homebrew):

```bash
# install Homebrew if you don't have it (see https://brew.sh)
#/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# install latest Node.js (includes npm)
brew install node
```

- Using nvm (Node Version Manager — useful if you need multiple Node versions):

```bash
# install nvm (if not installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash
# then either restart your shell or source your profile, then:
nvm install --lts
nvm use --lts
```

2) Install dependencies (if any)

This project doesn't currently include a package.json, but if you add one or dependencies later, run:

```bash
# from the project root
npm install
```

3) Run the server

Start the app with Node:

```bash
# from the project root
node server.js
```

By default the app listens on the port defined in `server.js` (commonly 3000 or 8080). Open your browser at `http://localhost:PORT` (replace PORT with the value used in `server.js`).

4) Notes for students

- If you see a permission error with Homebrew or npm, prefer using `nvm` to manage Node versions.
- To keep the server running during development, consider using `nodemon`:

```bash
npm install -g nodemon
nodemon server.js
```

## Contributing

If you'd like to contribute, fork the repo, make changes, and open a pull request.

