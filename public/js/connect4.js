// Connect Four puzzle for the Minecraft theme.
// The player is red and moves first; the computer (yellow) uses an
// iterative-deepening alpha-beta search, which makes it hard to beat.

var connectFour = (function () {
    var COLS = 7;
    var ROWS = 6;
    var EMPTY = 0, PLAYER = 1, COMPUTER = 2;
    var WIN_SCORE = 1000000;
    var THINK_TIME_MS = 1000;            // how long the computer searches each move
    var MAX_DEPTH = COLS * ROWS;
    var COLUMN_ORDER = [3, 2, 4, 1, 5, 0, 6]; // try center columns first

    // board[col * ROWS + row], row 0 is the bottom
    var board = new Array(COLS * ROWS).fill(EMPTY);
    var heights = new Array(COLS).fill(0);
    var movesPlayed = 0;
    var gameOver = false;
    var computerThinking = false;
    var gameNumber = 0; // bumped on reset so a pending win action can tell the game changed

    var container, statusElement;

    // Every line of four cells on the board, used by the evaluation
    var WINDOWS = (function () {
        var windows = [];
        var directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        for (var c = 0; c < COLS; c++) {
            for (var r = 0; r < ROWS; r++) {
                directions.forEach(function (d) {
                    var endC = c + 3 * d[0], endR = r + 3 * d[1];
                    if (endC < 0 || endC >= COLS || endR < 0 || endR >= ROWS) return;
                    var cells = [];
                    for (var k = 0; k < 4; k++) cells.push((c + k * d[0]) * ROWS + (r + k * d[1]));
                    windows.push(cells);
                });
            }
        }
        return windows;
    })();

    function play(col, who) {
        board[col * ROWS + heights[col]] = who;
        heights[col]++;
        movesPlayed++;
    }

    function undo(col) {
        heights[col]--;
        board[col * ROWS + heights[col]] = EMPTY;
        movesPlayed--;
    }

    function cellAt(c, r) {
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return -1;
        return board[c * ROWS + r];
    }

    // Returns the winning cells if the last piece dropped in `col` made four in a row
    function winningLine(col) {
        var r = heights[col] - 1;
        var who = cellAt(col, r);
        var directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        for (var i = 0; i < directions.length; i++) {
            var dc = directions[i][0], dr = directions[i][1];
            var line = [[col, r]];
            for (var s = 1; cellAt(col + s * dc, r + s * dr) === who; s++) line.push([col + s * dc, r + s * dr]);
            for (var s2 = 1; cellAt(col - s2 * dc, r - s2 * dr) === who; s2++) line.push([col - s2 * dc, r - s2 * dr]);
            if (line.length >= 4) return line;
        }
        return null;
    }

    // Heuristic score of the position for `who`
    function evaluate(who) {
        var other = who === PLAYER ? COMPUTER : PLAYER;
        var score = 0;
        for (var i = 0; i < WINDOWS.length; i++) {
            var w = WINDOWS[i], mine = 0, theirs = 0;
            for (var k = 0; k < 4; k++) {
                var v = board[w[k]];
                if (v === who) mine++;
                else if (v === other) theirs++;
            }
            if (mine > 0 && theirs > 0) continue;
            if (mine === 3) score += 50;
            else if (mine === 2) score += 5;
            else if (theirs === 3) score -= 60;
            else if (theirs === 2) score -= 5;
        }
        // Center control
        for (var r = 0; r < ROWS; r++) {
            var center = board[3 * ROWS + r];
            if (center === who) score += 6;
            else if (center === other) score -= 6;
        }
        return score;
    }

    function TimeUp() {}

    function negamax(who, depth, alpha, beta, ply, deadline, order) {
        if (performance.now() > deadline) throw new TimeUp();

        var other = who === PLAYER ? COMPUTER : PLAYER;
        var moves = order || COLUMN_ORDER;

        // Take an immediate win if there is one
        for (var i = 0; i < moves.length; i++) {
            var c = moves[i];
            if (heights[c] >= ROWS) continue;
            play(c, who);
            var won = winningLine(c);
            undo(c);
            if (won) return WIN_SCORE - ply;
        }

        if (movesPlayed === COLS * ROWS) return 0;
        if (depth === 0) return evaluate(who);

        var best = -Infinity;
        for (var j = 0; j < moves.length; j++) {
            var col = moves[j];
            if (heights[col] >= ROWS) continue;
            play(col, who);
            var score = -negamax(other, depth - 1, -beta, -alpha, ply + 1, deadline, null);
            undo(col);
            if (score > best) best = score;
            if (score > alpha) alpha = score;
            if (alpha >= beta) break;
        }
        return best;
    }

    // Search deeper and deeper until time runs out; keep the last finished result
    function chooseComputerMove() {
        var deadline = performance.now() + THINK_TIME_MS;
        var order = COLUMN_ORDER.filter(function (c) { return heights[c] < ROWS; });
        var bestMove = order[0];
        // The search is aborted mid-move when time runs out, so keep a copy to restore
        var savedBoard = board.slice(), savedHeights = heights.slice(), savedMoves = movesPlayed;

        for (var depth = 1; depth <= MAX_DEPTH - movesPlayed; depth++) {
            try {
                var bestScore = -Infinity, depthBest = order[0];
                var scores = {};
                for (var i = 0; i < order.length; i++) {
                    var c = order[i];
                    play(c, COMPUTER);
                    var score = winningLine(c)
                        ? WIN_SCORE
                        : -negamax(PLAYER, depth - 1, -Infinity, -bestScore, 1, deadline, null);
                    undo(c);
                    scores[c] = score;
                    if (score > bestScore) {
                        bestScore = score;
                        depthBest = c;
                    }
                }
                bestMove = depthBest;
                // Search the best moves first next time
                order.sort(function (a, b) { return scores[b] - scores[a]; });
                if (bestScore >= WIN_SCORE - MAX_DEPTH) break; // found a forced win
            } catch (e) {
                if (e instanceof TimeUp) {
                    for (var k = 0; k < board.length; k++) board[k] = savedBoard[k];
                    for (var h = 0; h < COLS; h++) heights[h] = savedHeights[h];
                    movesPlayed = savedMoves;
                    break;
                }
                throw e;
            }
        }
        return bestMove;
    }

    function setStatus(text) {
        if (statusElement) statusElement.textContent = text;
    }

    var cells = []; // cells[col * ROWS + row], built once by buildBoard()

    // Create the board's elements once. Re-creating them on every move would
    // detach the clicked element mid-click, and the theme selector's
    // "clicked outside" check would then close the pop-up.
    function buildBoard() {
        container.innerHTML = '';
        for (var c = 0; c < COLS; c++) {
            var column = document.createElement('div');
            column.className = 'c4-column';
            column.setAttribute('data-col', c);
            for (var r = ROWS - 1; r >= 0; r--) {
                var cell = document.createElement('div');
                cells[c * ROWS + r] = cell;
                column.appendChild(cell);
            }
            container.appendChild(column);
        }
    }

    function render(highlight) {
        var highlighted = {};
        (highlight || []).forEach(function (p) { highlighted[p[0] * ROWS + p[1]] = true; });

        for (var i = 0; i < cells.length; i++) {
            var v = board[i];
            cells[i].className = 'c4-cell' +
                (v === PLAYER ? ' c4-player' : v === COMPUTER ? ' c4-computer' : '') +
                (highlighted[i] ? ' c4-winning' : '');
        }
    }

    function finish(line, who) {
        gameOver = true;
        render(line);
        if (who === PLAYER) {
            setStatus('You win!');
            unlockTheme('minecraft');
            runConfetti();
            // Let the player see the winning line before switching to the theme,
            // unless they've closed the puzzle or started a new game since
            var wonGame = gameNumber;
            setTimeout(function () {
                var modalOpen = document.getElementById('puzzleModal').style.display === 'block';
                if (wonGame === gameNumber && modalOpen) meepMorp('minecraft');
            }, 1000);
        } else {
            setStatus('The computer wins. Press Start New Game to try again.');
        }
    }

    function onColumnClick(col) {
        if (gameOver || computerThinking || heights[col] >= ROWS) return;

        play(col, PLAYER);
        var line = winningLine(col);
        if (line) return finish(line, PLAYER);
        if (movesPlayed === COLS * ROWS) {
            gameOver = true;
            render();
            return setStatus('Draw! Press Start New Game to try again.');
        }

        computerThinking = true;
        render();
        setStatus('Thinking...');

        // Let the page draw the player's piece before the search blocks it
        setTimeout(function () {
            var move = chooseComputerMove();
            play(move, COMPUTER);
            computerThinking = false;
            var computerLine = winningLine(move);
            if (computerLine) return finish(computerLine, COMPUTER);
            if (movesPlayed === COLS * ROWS) {
                gameOver = true;
                render();
                return setStatus('Draw! Press Start New Game to try again.');
            }
            render();
            setStatus('Your move (red).');
        }, 50);
    }

    function reset() {
        if (computerThinking) return;
        gameNumber++;
        board.fill(EMPTY);
        heights.fill(0);
        movesPlayed = 0;
        gameOver = false;
        render();
        setStatus('Your move (red). Get four in a row to win!');
    }

    function init() {
        container = document.getElementById('connect4-board');
        statusElement = document.getElementById('feedback-message-minecraft');
        if (!container) return;

        container.addEventListener('click', function (event) {
            var column = event.target.closest('.c4-column');
            if (column) onColumnClick(parseInt(column.getAttribute('data-col'), 10));
        });
        document.getElementById('startBtnMinecraft').addEventListener('click', reset);
        buildBoard();
        reset();
    }

    document.addEventListener('DOMContentLoaded', init);

    return { reset: reset };
})();
