// Game State
let gameState = {
    p1: { name: 'Player 1', score: 501, legs: 0, prevScore: 501, throws: [], totalDarts: 0, totalScore: 0, legDarts: 0, legScore: 0, scoreHistory: [] },
    p2: { name: 'Player 2', score: 501, legs: 0, prevScore: 501, throws: [], totalDarts: 0, totalScore: 0, legDarts: 0, legScore: 0, scoreHistory: [] },
    startScore: 501,
    targetLegs: 3,
    outMode: 'Double', // 'Double' or 'Single'
    activePlayer: 1,
    boardIp: '127.0.0.1',
    isMatchActive: false,
    pollInterval: null,

    // Turn State
    turnDarts: [null, null, null], // Array of { value: 'S20', raw: 20, multiplier: 1 }
    turnOverrides: [null, null, null], // Keeps track of manual adjustments
    turnScore: 0,
    boardStatus: 'Offline', // Offline, Wait, Throwing, Takeout
    lastBoardDataStr: '' // For deduplication
};

// Polling interval in ms
const POLL_RATE = 500;

// DOM Elements
const views = {
    setup: document.getElementById('setup-view'),
    game: document.getElementById('game-view'),
    winner: document.getElementById('winner-view'),
    adjModal: document.getElementById('adjustment-modal')
};

// Init Event Listeners
document.getElementById('setup-form').addEventListener('submit', startGame);
document.getElementById('end-match-btn').addEventListener('click', endMatch);
document.getElementById('next-leg-btn').addEventListener('click', () => resetMatch(true));
document.getElementById('rematch-btn').addEventListener('click', () => resetMatch(false));
document.getElementById('new-players-btn').addEventListener('click', () => {
    views.winner.classList.add('hidden');
    views.winner.classList.remove('active');
    endMatch();
});

// Setup
function startGame(e) {
    if (e) e.preventDefault();

    gameState.p1.name = document.getElementById('p1-name').value || 'Player 1';
    gameState.p2.name = document.getElementById('p2-name').value || 'Player 2';
    gameState.startScore = parseInt(document.getElementById('start-score').value);
    gameState.targetLegs = parseInt(document.getElementById('target-legs').value) || 3;
    gameState.outMode = document.getElementById('out-mode').value || 'Double';
    gameState.boardIp = document.getElementById('board-ip').value || '127.0.0.1';

    // Init Scores
    resetMatch(false);

    // Switch View
    views.setup.classList.remove('active');
    setTimeout(() => views.setup.classList.add('hidden'), 300);

    views.game.classList.remove('hidden');

    updateUI();

    gameState.isMatchActive = true;
    startPolling();
}

function resetMatch(keepLegs = false) {
    gameState.p1.score = gameState.startScore;
    gameState.p1.prevScore = gameState.startScore;
    gameState.p1.throws = [];
    gameState.p1.legDarts = 0;
    gameState.p1.legScore = 0;
    gameState.p1.scoreHistory = [gameState.startScore];

    gameState.p2.score = gameState.startScore;
    gameState.p2.prevScore = gameState.startScore;
    gameState.p2.throws = [];
    gameState.p2.legDarts = 0;
    gameState.p2.legScore = 0;
    gameState.p2.scoreHistory = [gameState.startScore];

    if (!keepLegs) {
        gameState.p1.legs = 0;
        gameState.p1.totalDarts = 0;
        gameState.p1.totalScore = 0;
        gameState.p2.legs = 0;
        gameState.p2.totalDarts = 0;
        gameState.p2.totalScore = 0;
        gameState.activePlayer = 1;
    } else {
        // Loser starts next leg
        gameState.activePlayer = document.getElementById('winner-name').innerText.includes(gameState.p1.name) ? 2 : 1;
        views.winner.classList.add('hidden');
        views.winner.classList.remove('active');
        gameState.isMatchActive = true;
    }

    clearTurn();
    updateUI();
}

function endMatch() {
    gameState.isMatchActive = false;
    stopPolling();
    views.game.classList.add('hidden');
    views.setup.classList.remove('hidden');
    setTimeout(() => views.setup.classList.add('active'), 10);
}

// Checkouts (Basic setup for Double out)
const checkouts = {
    170: 'T20 T20 Bull', 167: 'T20 T19 Bull', 164: 'T20 T18 Bull', 161: 'T20 T17 Bull',
    160: 'T20 T20 D20', 158: 'T20 T20 D19', 156: 'T20 T20 D18', 154: 'T20 T18 D20',
    152: 'T20 T20 D16', 150: 'T20 T18 D18', 148: 'T20 T16 D20', 146: 'T20 T18 D16',
    144: 'T20 T20 D12', 142: 'T20 T14 D20', 140: 'T20 T20 D10',
    // We can expand this, or use an algorithm. Simple for now:
    100: 'T20 D20', 80: 'T20 D10', 60: 'S20 D20', 40: 'D20', 32: 'D16'
};

function getCheckoutString(score) {
    if (gameState.outMode === 'Single') {
        if (score <= 20) return `S${score}`;
        if (score === 25) return 'Bull';
        if (score <= 40 && score % 2 === 0) return `D${score / 2}`;
        if (score <= 60 && score % 3 === 0) return `T${score / 3}`;
        if (score === 50) return 'D-Bull';
    }

    if (score > 170 || [169, 168, 166, 165, 163, 162, 159].includes(score)) return '';
    if (checkouts[score]) return checkouts[score];
    if (score <= 40 && score % 2 === 0) return `D${score / 2}`; // Simple even doubles
    return '';
}

// UI Updates
function updateUI() {
    // Names & Legs
    document.getElementById('p1-display-name').innerText = gameState.p1.name;
    document.getElementById('p2-display-name').innerText = gameState.p2.name;
    document.getElementById('p1-legs').innerText = gameState.p1.legs;
    document.getElementById('p2-legs').innerText = gameState.p2.legs;

    // Active Player Indicator
    if (gameState.activePlayer === 1) {
        document.getElementById('p1-card').classList.add('active-turn');
        document.getElementById('p2-card').classList.remove('active-turn');
    } else {
        document.getElementById('p2-card').classList.add('active-turn');
        document.getElementById('p1-card').classList.remove('active-turn');
    }

    // Scores
    const p1State = gameState.p1;
    const p2State = gameState.p2;

    document.getElementById('p1-score').innerText = p1State.score;
    // Render score history (max 5 items to match screenshot layout)
    const p1HistoryHtml = p1State.scoreHistory.slice(-5).map(s => `<div class="prev-score">${s}</div>`).join('');
    document.getElementById('p1-history-container').innerHTML = p1HistoryHtml;

    document.getElementById('p2-score').innerText = p2State.score;
    const p2HistoryHtml = p2State.scoreHistory.slice(-5).map(s => `<div class="prev-score">${s}</div>`).join('');
    document.getElementById('p2-history-container').innerHTML = p2HistoryHtml;

    // Current Turn Darts
    for (let i = 0; i < 3; i++) {
        const box = document.getElementById(`dart-${i + 1}`);
        const textSpan = box.querySelector('.dart-text');
        const dart = gameState.turnDarts[i];

        box.classList.remove('selected-dart');
        if (i === activeDartIndex) {
            box.classList.add('selected-dart');
        }

        if (dart) {
            textSpan.innerText = dart.value;
            box.classList.add('has-value');
        } else {
            textSpan.innerText = '-';
            box.classList.remove('has-value');
        }
    }

    document.getElementById('turn-score').innerText = gameState.turnScore;

    // Checkouts & Averages
    [1, 2].forEach(pNum => {
        const pState = pNum === 1 ? gameState.p1 : gameState.p2;
        let isAct = gameState.activePlayer === pNum;
        let currValidDarts = 0;
        let currTurnScore = 0;

        if (isAct) {
            currValidDarts = gameState.turnDarts.filter(d => d !== null).length;
            currTurnScore = gameState.turnScore;
        }

        let totalDarts = pState.totalDarts + currValidDarts;
        let totalScore = pState.totalScore + currTurnScore;
        let legDarts = pState.legDarts + currValidDarts;
        let legScore = pState.legScore + currTurnScore;

        let totalAvg = totalDarts > 0 ? (totalScore / totalDarts) * 3 : 0;
        let legAvg = legDarts > 0 ? (legScore / legDarts) * 3 : 0;

        document.getElementById(`p${pNum}-darts`).innerText = legDarts;
        document.getElementById(`p${pNum}-avg`).innerText = totalAvg.toFixed(2);
        document.getElementById(`p${pNum}-leg-avg`).innerText = legAvg.toFixed(2);
    });

    const activeScore = gameState.activePlayer === 1 ? gameState.p1.score : gameState.p2.score;
    const guideText = getCheckoutString(activeScore);
    const guideEl = document.getElementById('checkout-guide');
    if (guideText) {
        guideEl.innerText = guideText;
        guideEl.classList.remove('hidden');
    } else {
        guideEl.classList.add('hidden');
    }
}

function updateConnectionStatus(isOnline, state = 'Idle') {
    const dSetup = document.querySelector('#board-status-setup .dot');
    const tSetup = document.querySelector('#board-status-setup span');
    const dGame = document.querySelector('#board-status-game .dot');
    const tGame = document.getElementById('board-state-text');

    if (!isOnline) {
        gameState.boardStatus = 'Offline';
        [dSetup, dGame].forEach(d => { d.className = 'dot offline'; d.style.background = 'var(--danger)'; d.style.boxShadow = '0 0 8px var(--danger)'; });
        if (tSetup) tSetup.innerText = 'Board: Offline';
        if (tGame) tGame.innerText = 'Board Offline';
    } else {
        gameState.boardStatus = state;
        let colorClass = 'dot';
        let bgStyle = 'var(--success)';
        if (state.includes('Throw')) { colorClass = 'dot throwing'; bgStyle = 'var(--accent)'; }
        if (state.includes('Takeout')) { colorClass = 'dot takeout'; bgStyle = '#d29922'; }

        [dSetup, dGame].forEach(d => { d.className = colorClass; d.style.background = bgStyle; d.style.boxShadow = `0 0 8px ${bgStyle}`; });
        if (tSetup) tSetup.innerText = `Board: ${state}`;
        if (tGame) tGame.innerText = `Board State: ${state}`;
    }
}

// Polling & Game Engine
function startPolling() {
    if (gameState.pollInterval) clearInterval(gameState.pollInterval);
    gameState.pollInterval = setInterval(fetchBoardData, POLL_RATE);
}

function stopPolling() {
    if (gameState.pollInterval) {
        clearInterval(gameState.pollInterval);
        gameState.pollInterval = null;
    }
}

async function fetchBoardData() {
    try {
        const res = await fetch(`/api/board?ip=${encodeURIComponent(gameState.boardIp)}`);
        if (!res.ok) throw new Error('Offline');
        const data = await res.json();

        const oldStatus = gameState.boardStatus;
        updateConnectionStatus(true, data.status || 'Idle');
        processBoardData(data, oldStatus);
    } catch (err) {
        updateConnectionStatus(false);
    }
}

function processBoardData(data, previousStatus) {
    const dataStr = JSON.stringify(data);
    // Optimization: Skip if nothing changed at all
    if (dataStr === gameState.lastBoardDataStr) return;
    gameState.lastBoardDataStr = dataStr;

    if (!gameState.isMatchActive) return;

    // Check Turn State changes
    const currentStatus = data.status || 'Idle';
    const isTakeout = currentStatus.includes('Takeout');
    const wasTakeout = previousStatus.includes('Takeout');
    const isThrow = currentStatus.includes('Throw');

    let darts = [];

    // We only process the darts if we are actively throwing, or if we JUST hit Takeout.
    // We do NOT process the darts if we are already IN Takeout from a previous poll,
    // because that would apply the previous player's darts to the next player's score!
    let shouldProcessDarts = (!isTakeout) || (isTakeout && !wasTakeout);

    if (shouldProcessDarts) {
        let boardThrows = (data.throws && Array.isArray(data.throws)) ? data.throws : [];
        // The array might be empty (e.g. during Takeout in progress). 
        // We MUST process all 3 slots to preserve any manual overrides.
        for (let i = 0; i < 3; i++) {
            // First check if there is a manual override for this slot
            if (gameState.turnOverrides && gameState.turnOverrides[i]) {
                darts.push(gameState.turnOverrides[i]);
            } else if (gameState.turnOverrides[i] === false) {
                // 'false' means it was explicitly cleared/undone, so we IGNORE what the board says for this slot
                // We just don't push anything.
            } else if (boardThrows[i] && boardThrows[i].segment && boardThrows[i].segment.name) {
                // Otherwise read from the board
                darts.push(parseDartString(boardThrows[i].segment.name));
            } else if (gameState.turnDarts[i] !== null) {
                // FALLBACK: If the board suddenly sends fewer darts (e.g. because it's pulling them out),
                // but we already have valid darts locked in the UI, we should keep them until explicitly cleared!
                darts.push(gameState.turnDarts[i]);
            }
        }
    } else {
        // Keep existing darts if we shouldn't process new ones (e.g. already in takeout)
        darts = gameState.turnDarts.filter(d => d !== null);
    }

    // Always update Dart UI with current known darts as long as match is active.
    // BUT during Takeout, if the board clears the array, DO NOT clear the UI immediately
    // so the player can still see their throws.
    if (currentStatus !== 'Offline') {
        if (isTakeout && darts.length === 0) {
            // Do not update UI to clear darts during takeout
        } else {
            updateDartUI(darts, 0);
        }
    }

    // Darts are pulled out: transition from Takeout to Throw
    if (isThrow && wasTakeout) {
        commitTurn();
        clearTurn();
        updateUI();
    }
}

function parseDartString(str) {
    if (!str || str === 'MISS') return { value: '0', raw: 0, multiplier: 1, original: 'MISS' };

    const firstChar = str.charAt(0).toUpperCase();
    let multiplier = 1;
    let raw = 0;

    if (str === 'Bull' || str === '50') return { value: 'Bull', raw: 25, multiplier: 2, original: str };
    if (str === '25') return { value: '25', raw: 25, multiplier: 1, original: str };

    if (firstChar === 'S') multiplier = 1;
    else if (firstChar === 'D') multiplier = 2;
    else if (firstChar === 'T') multiplier = 3;

    if (['S', 'D', 'T'].includes(firstChar)) {
        raw = parseInt(str.substring(1));
        return { value: str, raw: raw, multiplier: multiplier, original: str };
    }

    // Fallback if just a number
    raw = parseInt(str);
    if (isNaN(raw)) return { value: '0', raw: 0, multiplier: 1, original: str };
    return { value: str, raw: raw, multiplier: 1, original: str };
}

function updateDartUI(darts, serverTurnScore) {
    gameState.turnDarts = [null, null, null];
    let localCalcScore = 0;

    for (let i = 0; i < darts.length; i++) {
        if (i > 2) break;
        gameState.turnDarts[i] = darts[i];
        localCalcScore += (darts[i].raw * darts[i].multiplier);
    }

    // We trust local calc if board API implies it, but can fall back to serverTurnScore
    gameState.turnScore = localCalcScore;

    // Temporarily deduct from active player to show remaining
    const activeP = gameState.activePlayer === 1 ? gameState.p1 : gameState.p2;
    let tempScore = activeP.prevScore - gameState.turnScore;

    // BUST Logic
    if (gameState.outMode === 'Double') {
        if (tempScore < 0 || tempScore === 1) {
            tempScore = activeP.prevScore; // Bust, score resets to prev
            gameState.turnScore = 0; // Turn score essentially 0
        }
    } else {
        // Single Out
        if (tempScore < 0) {
            tempScore = activeP.prevScore; // Bust
            gameState.turnScore = 0;
        }
    }

    activeP.score = tempScore;
    updateUI();

    // Check win condition instantly
    if (tempScore === 0) {
        const lastThrow = gameState.turnDarts.slice().reverse().find(d => d !== null);

        let isValidCheckout = false;
        if (gameState.outMode === 'Double') {
            isValidCheckout = lastThrow && lastThrow.multiplier === 2;
        } else {
            isValidCheckout = true; // Single Out accepts anything reaching 0
        }

        if (isValidCheckout) {
            // Manually commit final turn stats before popping winner modal
            const validDartsCount = gameState.turnDarts.filter(d => d !== null).length;
            activeP.totalDarts += validDartsCount;
            activeP.legDarts += validDartsCount;
            activeP.totalScore += gameState.turnScore;
            activeP.legScore += gameState.turnScore;
            activeP.throws.push(gameState.turnScore);
            activeP.prevScore = 0;

            handleLegWin(gameState.activePlayer);
        } else {
            // Bust on invalid checkout
            activeP.score = activeP.prevScore;
            gameState.turnScore = 0;
            updateUI();
        }
    }
}

function commitTurn() {
    const activeP = gameState.activePlayer === 1 ? gameState.p1 : gameState.p2;
    activeP.prevScore = activeP.score;
    activeP.throws.push(gameState.turnScore);
    activeP.scoreHistory.push(activeP.score); // Push history for chalkboard list

    const validDartsCount = gameState.turnDarts.filter(d => d !== null).length;
    activeP.totalDarts += validDartsCount;
    activeP.legDarts += validDartsCount;
    activeP.totalScore += gameState.turnScore;
    activeP.legScore += gameState.turnScore;

    switchTurn();
}

function switchTurn() {
    // We no longer clearTurn() here. It happens when the next Throw state starts.
    gameState.activePlayer = gameState.activePlayer === 1 ? 2 : 1;
    updateUI();
}

function clearTurn() {
    gameState.turnDarts = [null, null, null];
    gameState.turnOverrides = [null, null, null];
    gameState.turnScore = 0;
    gameState.lastBoardDataStr = ''; // Force refresh
}

function handleLegWin(playerNum) {
    // Win Leg
    if (playerNum === 1) gameState.p1.legs++;
    else gameState.p2.legs++;

    updateUI();

    const isMatchWin = gameState[playerNum === 1 ? 'p1' : 'p2'].legs >= gameState.targetLegs;
    const winnerName = gameState[playerNum === 1 ? 'p1' : 'p2'].name;

    document.getElementById('winner-title').innerText = isMatchWin ? "MATCH SHOT!" : "GAME SHOT!";
    document.getElementById('winner-name').innerText = isMatchWin ? `${winnerName} Wins the Match!` : `${winnerName} Wins the Leg!`;

    document.getElementById('final-legs-p1').innerText = gameState.p1.legs;
    document.getElementById('final-legs-p2').innerText = gameState.p2.legs;

    // Use the explicitly tracked Match Average for the winning player
    const pState = gameState[playerNum === 1 ? 'p1' : 'p2'];
    const matchAvg = pState.totalDarts > 0 ? (pState.totalScore / pState.totalDarts) * 3 : 0;

    document.getElementById('winner-avg').innerText = matchAvg.toFixed(2);

    if (isMatchWin) {
        document.getElementById('next-leg-btn').classList.add('hidden');
        document.getElementById('rematch-btn').classList.remove('hidden');
    } else {
        document.getElementById('next-leg-btn').classList.remove('hidden');
        document.getElementById('rematch-btn').classList.add('hidden');
    }

    gameState.isMatchActive = false;
    views.winner.classList.remove('hidden');
    views.winner.classList.add('active');
}

// Manual Keyboard Logic
let activeMultiplier = 1;
let activeDartIndex = -1; // -1 means auto-fill next empty space, 0/1/2 targets specific dart

function setMultiplier(mult) {
    activeMultiplier = mult;
    document.querySelectorAll('.key-mult').forEach(btn => btn.classList.remove('multiplier-active'));
    if (mult === 2) document.getElementById('btn-double').classList.add('multiplier-active');
    if (mult === 3) document.getElementById('btn-triple').classList.add('multiplier-active');
}

// Dart Selection
for (let i = 0; i < 3; i++) {
    document.getElementById(`dart-${i + 1}`).addEventListener('click', () => {
        if (!gameState.isMatchActive) return;
        // Toggle selection off if clicking the already selected dart
        if (activeDartIndex === i) {
            activeDartIndex = -1;
        } else {
            activeDartIndex = i;
        }
        updateUI();
    });
}

// Multiplier toggle
document.getElementById('btn-double').addEventListener('click', () => {
    setMultiplier(activeMultiplier === 2 ? 1 : 2);
});
document.getElementById('btn-triple').addEventListener('click', () => {
    setMultiplier(activeMultiplier === 3 ? 1 : 3);
});

// Segment clicks
document.querySelectorAll('.key-num, .key-spec').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (!gameState.isMatchActive) return;

        const rawVal = parseInt(e.target.dataset.val);
        let multiplier = activeMultiplier;

        // Validation rules
        if (rawVal === 0) multiplier = 1; // Miss is always 1
        if (rawVal === 25 && multiplier === 3) multiplier = 1; // No Triple Bull, fallback to Single

        let valStr = rawVal.toString();
        if (rawVal > 0 && rawVal <= 20) {
            valStr = (multiplier === 3 ? 'T' : multiplier === 2 ? 'D' : 'S') + rawVal;
        } else if (rawVal === 25) {
            if (multiplier === 2) valStr = 'Bull';
            else valStr = '25';
        } else {
            valStr = 'MISS';
            multiplier = 1;
        }

        const manualDart = { value: valStr, raw: rawVal, multiplier: multiplier, original: 'MANUAL' };

        let targetIndex = activeDartIndex;

        // Find next empty slot if not explicitly targeting
        if (targetIndex === -1) {
            targetIndex = gameState.turnDarts.findIndex(d => d === null);
        }

        if (targetIndex !== -1 && targetIndex < 3) {
            gameState.turnDarts[targetIndex] = manualDart;
            gameState.turnOverrides[targetIndex] = manualDart;

            // Recalculate
            updateDartUI(gameState.turnDarts.filter(d => d !== null), 0);
            gameState.lastBoardDataStr = ''; // Force poll refresh

            // Auto-reset multiplier & selection
            setMultiplier(1);
            activeDartIndex = -1; // Deselect after input
            updateUI();
        }
    });
});

// Undo Logic
document.getElementById('btn-undo').addEventListener('click', () => {
    if (!gameState.isMatchActive) return;

    // Find highest index dart to remove (or targeted dart)
    let removeIndex = activeDartIndex;

    if (removeIndex === -1) {
        for (let i = 2; i >= 0; i--) {
            if (gameState.turnDarts[i] !== null) {
                removeIndex = i;
                break;
            }
        }
    }

    if (removeIndex !== -1) {
        gameState.turnDarts[removeIndex] = null;
        // Explicitly mark as 'false' which means "undone/cleared by user", ignore board data for this slot
        gameState.turnOverrides[removeIndex] = false;
    }

    updateDartUI(gameState.turnDarts.filter(d => d !== null), 0);
    gameState.lastBoardDataStr = '';

    if (activeDartIndex !== -1) {
        activeDartIndex = -1;
        updateUI();
    }
});

// Next Button overrides board takeout logic
document.getElementById('btn-next').addEventListener('click', () => {
    if (!gameState.isMatchActive) return;
    const hasDarts = gameState.turnDarts.some(d => d !== null);
    if (!hasDarts) return; // Can't skip turn if empty

    commitTurn();
    clearTurn();
    updateUI();
});
