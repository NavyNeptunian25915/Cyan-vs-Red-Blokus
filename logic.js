// --- Game setup ---
const board = document.getElementById('game-board');
const turnDisplay = document.getElementById('turn-display');
const messageArea = document.getElementById('message-area');
const cyanPiecesEl = document.getElementById('cyan-pieces');
const redPiecesEl = document.getElementById('red-pieces');
const rotateBtn = document.getElementById('rotate-btn');
const flipBtn = document.getElementById('flip-btn');
const evalBarEl = document.getElementById('eval-bar'); // Evaluation bar
const moveLogEl = document.getElementById('move-log'); // Game review log
const undoBtn = document.getElementById('undo-btn').addEventListener('click', undoMove);

// --- Select board size dynamically ---
let BOARD_SIZE = parseInt(prompt("Enter board size (e.g., 15 for 15x15):", "15"));
if (isNaN(BOARD_SIZE) || BOARD_SIZE < 5) BOARD_SIZE = 5; // Minimum size 5x5
if (isNaN(BOARD_SIZE) || BOARD_SIZE > 1000) BOARD_SIZE = 1000; // Maximum size 1000x1000

// --- Seeded RNG for deterministic analysis ---
const rngSeedInput = prompt("Enter RNG seed (leave blank for random):", "");
function _hashCode(str){
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
function _mulberry32(a) {
    return function() {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}
const _seed = (rngSeedInput && rngSeedInput.trim() !== "") ? _hashCode(rngSeedInput) : Math.floor(Math.random() * 1e9);
const rng = _mulberry32(_seed);

let gameState = {
    board: Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(null)),
    turn: 'cyan',       // cyan is human, red is AI
    cyanPieces: [],
    redPieces: [],
    selectedPiece: null,
    selectedPieceIndex: -1,
    hasPlayed: { cyan: false, red: false },
    moveHistory: []
};

// --- Shapes (expanded) ---
const pieceShapes = generateShapes();



// --- Create board dynamically ---
function createBoard() {
    board.innerHTML = '';
    board.style.display = 'grid';
    board.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 25px)`;
    board.style.gridTemplateRows = `repeat(${BOARD_SIZE}, 25px)`;
    board.style.width = `${BOARD_SIZE * 25}px`;
    board.style.height = `${BOARD_SIZE * 25}px`;

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.style.width = '25px';
            cell.style.height = '25px';
            cell.style.border = '1px solid #fff';
            cell.addEventListener('dragover', e => e.preventDefault());
            cell.addEventListener('drop', handleDrop);
            board.appendChild(cell);
        }
    }
}
// --- Undo move ---
function undoMove() {
    if (gameState.moveHistory.length === 0) {
        showMessage("No moves to undo!");
        return;
    }

    const lastMove = gameState.moveHistory.pop();
    const { player, index, row, col } = lastMove;
    const pieceShape = pieceShapes[index]; // get shape by index

    // Remove piece from board
    for (let r = 0; r < pieceShape.length; r++) {
        for (let c = 0; c < pieceShape[r].length; c++) {
            if (pieceShape[r][c]) {
                gameState.board[row + r][col + c] = null;
            }
        }
    }

    // Restore piece back to player's pool
    if (player === 'cyan') {
        gameState.cyanPieces.push({ shape: pieceShape, player: 'cyan' });
    } else {
        gameState.redPieces.push({ shape: pieceShape, player: 'red' });
    }

    // Revert turn
    gameState.turn = player;
    turnDisplay.textContent = `${gameState.turn.charAt(0).toUpperCase() + gameState.turn.slice(1)}'s Turn`;

    // Update UI
    renderPieces();
    renderBoard();
    updateGameReview();
    showMessage(`${player} undid their move.`);
}
// --- Generate shapes automatically (200+ variations) ---
function generateShapes() {
    const shapes = [];

    // --- Single ---
    shapes.push([[true]]);

    // --- Lines (horizontal + vertical up to length 7) ---
    for (let len = 2; len <= 7; len++) {
        shapes.push([Array(len).fill(true)]); // horizontal
        shapes.push(Array.from({ length: len }, () => [true])); // vertical
    }

    // --- Squares (2x2 to 6x6) ---
    for (let size = 2; size <= 6; size++) {
        const square = Array.from({ length: size }, () =>
            Array(size).fill(true)
        );
        shapes.push(square);
    }

    // --- L shapes (all sizes 2x2 up to 5x5 variations) ---
    for (let h = 2; h <= 5; h++) {
        for (let w = 2; w <= 5; w++) {
            const L = Array.from({ length: h }, () => Array(w).fill(false));
            for (let r = 0; r < h; r++) L[r][0] = true;
            for (let c = 0; c < w; c++) L[h - 1][c] = true;
            shapes.push(L);
        }
    }

    // --- T shapes (width 3 to 7) ---
    for (let w = 3; w <= 7; w++) {
        const T = [Array(w).fill(true)];
        const mid = Math.floor(w / 2);
        for (let i = 0; i < w - 2; i++) {
            const row = Array(w).fill(false);
            row[mid] = true;
            T.push(row);
        }
        shapes.push(T);
    }

    // --- Crosses (odd sizes 3 to 7) ---
    for (let size = 3; size <= 7; size += 2) {
        const mid = Math.floor(size / 2);
        const cross = Array.from({ length: size }, () =>
            Array(size).fill(false)
        );
        for (let i = 0; i < size; i++) {
            cross[mid][i] = true;
            cross[i][mid] = true;
        }
        shapes.push(cross);
    }

    // --- Hollow squares (rings, size 4 to 8) ---
    for (let size = 4; size <= 8; size++) {
        let hollow = Array.from({ length: size }, (_, i) =>
            Array.from({ length: size }, (_, j) =>
                i === 0 || j === 0 || i === size - 1 || j === size - 1
            )
        );
        shapes.push(hollow);
    }

    // --- Zigzag (staircase up to length 6) ---
    for (let len = 3; len <= 6; len++) {
        const zig = Array.from({ length: len }, (_, i) =>
            Array(len).fill(false)
        );
        for (let i = 0; i < len; i++) zig[i][i] = true;
        shapes.push(zig);
    }

    // --- Random blobs (extra variety) ---
    for (let n = 0; n < 100; n++) {
        const h = 2 + Math.floor(rng() * 5);
        const w = 2 + Math.floor(rng() * 5);
        const blob = Array.from({ length: h }, () =>
            Array.from({ length: w }, () => rng() > 0.5)
        );
        if (blob.flat().some(Boolean)) shapes.push(blob);
    }

    return shapes;
}



// --- Render pieces ---
function renderPieces() {
    cyanPiecesEl.innerHTML = '';
    redPiecesEl.innerHTML = '';

    gameState.cyanPieces.forEach((piece, index) => {
        const pieceEl = createPieceElement(piece, 'cyan', index);
        cyanPiecesEl.appendChild(pieceEl);
    });

    gameState.redPieces.forEach((piece, index) => {
        const pieceEl = createPieceElement(piece, 'red', index);
        redPiecesEl.appendChild(pieceEl);
    });

    updateGameReview();
}

// --- Create draggable piece ---
function createPieceElement(piece, player, index) {
    const pieceEl = document.createElement('div');
    pieceEl.className = `piece ${player}`;
    pieceEl.dataset.index = index;
    pieceEl.draggable = true;

    const grid = document.createElement('div');
    grid.className = 'piece-grid';
    grid.style.gridTemplateColumns = `repeat(${piece.shape[0].length}, 25px)`;
    grid.style.gridTemplateRows = `repeat(${piece.shape.length}, 25px)`;

    piece.shape.forEach(row => {
        row.forEach(cell => {
            const pieceCell = document.createElement('div');
            pieceCell.className = 'piece-cell';
            if (cell) {
                pieceCell.classList.add(player === 'cyan' ? 'filled-cyan' : 'filled-red');
            } else {
                pieceCell.classList.add('empty');
            }
            grid.appendChild(pieceCell);
        });
    });

    pieceEl.appendChild(grid);

    pieceEl.addEventListener('dragstart', e => {
        if (gameState.turn === player) {
            gameState.selectedPiece = piece;
            gameState.selectedPieceIndex = index;
            e.dataTransfer.setData("text/plain", `${player}:${index}`);
        } else e.preventDefault();
    });

    return pieceEl;
}




// --- Handle drop ---
function handleDrop(e) {
    e.preventDefault();
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);

    if (!gameState.selectedPiece) return;

    if (isValidPlacement(row, col)) {
        placePiece(row, col);
        endTurn(row, col, gameState.selectedPieceIndex);
    } else {
        showMessage("Invalid placement!");
    }
}

// --- Placement validation ---
function isValidPlacement(startRow, startCol) {
    const piece = gameState.selectedPiece.shape;
    const player = gameState.selectedPiece.player;
    let touchesCorner = false, touchesEdge = false, touchesDiagonal = false;

    for (let r = 0; r < piece.length; r++) {
        for (let c = 0; c < piece[r].length; c++) {
            if (piece[r][c]) {
                const br = startRow + r;
                const bc = startCol + c;
                if (br < 0 || br >= BOARD_SIZE || bc < 0 || bc >= BOARD_SIZE) return false;
                if (gameState.board[br][bc] !== null) return false;

                if (!gameState.hasPlayed[player]) {
                    if ((br === 0 && bc === 0) || (br === 0 && bc === BOARD_SIZE-1) ||
                        (br === BOARD_SIZE-1 && bc === 0) || (br === BOARD_SIZE-1 && bc === BOARD_SIZE-1)) touchesCorner = true;
                }

                const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
                for (const [dr,dc] of dirs) {
                    const nr=br+dr, nc=bc+dc;
                    if (nr>=0 && nr<BOARD_SIZE && nc>=0 && nc<BOARD_SIZE) {
                        if (gameState.board[nr][nc]===player) touchesEdge=true;
                    }
                }

                const diags=[[1,1],[1,-1],[-1,1],[-1,-1]];
                for (const [dr,dc] of diags) {
                    const nr=br+dr, nc=bc+dc;
                    if (nr>=0 && nr<BOARD_SIZE && nc>=0 && nc<BOARD_SIZE) {
                        if (gameState.board[nr][nc]===player) touchesDiagonal=true;
                    }
                }
            }
        }
    }

    return !gameState.hasPlayed[player] ? touchesCorner : (touchesDiagonal && !touchesEdge);
}

// --- Place piece ---
function placePiece(startRow,startCol) {
    const piece = gameState.selectedPiece.shape;
    const player = gameState.selectedPiece.player;

    for (let r=0;r<piece.length;r++) {
        for (let c=0;c<piece[r].length;c++) {
            if (piece[r][c]) gameState.board[startRow+r][startCol+c]=player;
        }
    }
    gameState.hasPlayed[player]=true;
    renderBoard();
}

// --- Render board ---
function renderBoard() {
    const cells = board.children;
    for (let r=0;r<BOARD_SIZE;r++) {
        for (let c=0;c<BOARD_SIZE;c++) {
            const idx=r*BOARD_SIZE+c;
            cells[idx].classList.remove('cyan','red','highlight');
            if (gameState.board[r][c]==='cyan') cells[idx].classList.add('cyan');
            if (gameState.board[r][c]==='red') cells[idx].classList.add('red');
        }
    }
}

// --- Count legal moves ---
function countLegalMoves(player) {
    const pieces = player==='cyan'?gameState.cyanPieces:gameState.redPieces;
    let count=0;
    for(const pieceObj of pieces){
        const piece={...pieceObj,player};
        gameState.selectedPiece=piece;
        for(let r=0;r<BOARD_SIZE;r++){
            for(let c=0;c<BOARD_SIZE;c++){
                if(isValidPlacement(r,c)) count++;
            }
        }
    }
    gameState.selectedPiece=null;
    return count;
}

// --- Suggest best moves ---
function suggestBestMoves(player) {
    const pieces = player==='cyan'?gameState.cyanPieces:gameState.redPieces;
    let bestMoves = [];
    let maxMoves = -1;

    for (let pi=0; pi<pieces.length; pi++) {
        const piece = {...pieces[pi], player};
        gameState.selectedPiece = piece;

        for(let r=0;r<BOARD_SIZE;r++){
            for(let c=0;c<BOARD_SIZE;c++){
                if(isValidPlacement(r,c)){
                    const backupBoard = JSON.parse(JSON.stringify(gameState.board));
                    for(let pr=0; pr<piece.shape.length; pr++){
                        for(let pc=0; pc<piece.shape[pr].length; pc++){
                            if(piece.shape[pr][pc]) gameState.board[r+pr][c+pc]=player;
                        }
                    }
                    const score = countLegalMoves(player);
                    if(score>maxMoves){
                        maxMoves = score;
                        bestMoves = [{row:r,col:c,index:pi}];
                    } else if(score===maxMoves){
                        bestMoves.push({row:r,col:c,index:pi});
                    }
                    gameState.board = backupBoard;
                }
            }
        }
    }

    gameState.selectedPiece = null;
    return bestMoves;
}

// --- AI move ---
function aiMove() {
    if (gameState.turn !== 'red') return;

    const bestMoves = suggestBestMoves('red');
    if (bestMoves.length === 0) {
        showMessage('Cyan wins! No legal moves left for red.');
        disableAllPieces();
        return;
    }

    const move = bestMoves[Math.floor(rng()*bestMoves.length)];
    gameState.selectedPiece = {...gameState.redPieces[move.index], player:'red'};
    placePiece(move.row, move.col);
    endTurn(move.row, move.col, move.index);
}

// --- Highlight best moves ---
function highlightBestMoves() {
    const bestMoves = suggestBestMoves(gameState.turn);
    const cells = board.children;
    bestMoves.forEach(move=>{
        const idx = move.row*BOARD_SIZE + move.col;
        if(cells[idx]) cells[idx].classList.add('highlight');
    });
}

// --- Update evaluation bar + move log with labeling ---
function updateGameReview() {
    const cyanMoves = countLegalMoves('cyan');
    const redMoves = countLegalMoves('red');
    const total = cyanMoves + redMoves;
    const cyanPercent = total === 0 ? 50 : (cyanMoves / total) * 100;
    const redPercent = total === 0 ? 50 : (redMoves / total) * 100;

    // Evaluation bar
    evalBarEl.innerHTML = `
        <div style="width:${cyanPercent}%;background:cyan;height:20px;float:left"></div>
        <div style="width:${redPercent}%;background:red;height:20px;float:left"></div>
    `;

    // Move log
    moveLogEl.innerHTML = gameState.moveHistory.map((m,i)=>{
        let label='', cssClass='';
        if(i===0){
            label = 'Good';
            cssClass='move-good';
        } else {
// ---- NEW ADVANCED MOVE CLASSIFIER ----
// Evaluate legal move ratios before and after move
const youLegalBefore = m.youLegalBefore;
const oppLegalBefore = m.oppLegalBefore;

const youLegalAfter = m.youLegalAfter;
const oppLegalAfter = m.oppLegalAfter;

// You suppression metric
const ratioBefore = youLegalBefore / (youLegalBefore + oppLegalBefore);
const ratioAfter = youLegalAfter / (youLegalAfter + oppLegalAfter);
const deltaYou = ratioAfter - ratioBefore;

// Opponent suppression metric
const oppRatioBefore = oppLegalBefore / (oppLegalBefore + youLegalBefore);
const oppRatioAfter = oppLegalAfter / (oppLegalAfter + youLegalAfter);
const deltaOpp = oppRatioAfter - oppRatioBefore;

// Store metrics for later review
m.youLegal = youLegalAfter;
m.oppLegal = oppLegalAfter;
m.ratio = ratioAfter.toFixed(3);

// ---- Threshold-based judgement ----
if (deltaYou >= 0 && deltaOpp <= -0.5) {
    label = "Sigma";
    cssClass = "move-sigma";
} else if (deltaYou >= 0.5 && deltaOpp <= 0) {
    label = "Chad";
    cssClass = "move-chad";
} else if (deltaYou >= 0 && deltaOpp <= 0) {
    label = "Good";
    cssClass = "move-good";
} else if (deltaYou >= -0.1 && deltaOpp <= 0.1) {
    label = "Ok";
    cssClass = "move-ok";
} else if (deltaYou >= -0.2 && deltaOpp <= 0.2) {
    label = "Strange";
    cssClass = "move-strange";
} else if (deltaYou >= -0.3 && deltaOpp <= 0.3) {
    label = "Bad";
    cssClass = "move-bad";
} else {
    label = "Clown";
    cssClass = "move-clown";
}
        }
        return `<div class="${cssClass}">${i+1}. ${m.player} placed piece ${m.index} at (${m.row},${m.col}) — ${label} (Eval: ${m.eval})</div>`;
    }).join('');

    renderBoard();
    highlightBestMoves();
}

// --- End turn ---
function endTurn(row,col,pieceIndex){
    const prevTurn = gameState.turn;
    const Position = (countLegalMoves('cyan') / (countLegalMoves('cyan') + countLegalMoves('red'))-0.5)*2; // Normalize between -1 to 1

// Compute legal move counts BEFORE move (use last state)
const prevHistory = gameState.moveHistory[gameState.moveHistory.length - 1];
const youLegalBefore = prevHistory ? prevHistory.youLegalAfter : countLegalMoves(prevTurn);
const oppLegalBefore = prevHistory ? prevHistory.oppLegalAfter : countLegalMoves(prevTurn === "cyan" ? "red" : "cyan");

// Compute legal move counts AFTER move
const youLegalAfter = countLegalMoves(prevTurn);
const oppLegalAfter = countLegalMoves(prevTurn === "cyan" ? "red" : "cyan");

// Freeze ratio calculations
const ratioBefore = youLegalBefore / Math.max(1, oppLegalBefore);
const ratioAfter = youLegalAfter / Math.max(1, oppLegalAfter);

const deltaYou = ratioAfter - ratioBefore;
const deltaOpp = (oppLegalAfter / Math.max(1, youLegalAfter)) - (oppLegalBefore / Math.max(1, youLegalBefore));

gameState.moveHistory.push({
    player: prevTurn,
    index: pieceIndex,
    row, col,
    eval: Position,
    youLegalBefore,
    oppLegalBefore,
    youLegalAfter,
    oppLegalAfter,
    ratioBefore: Number(ratioBefore.toFixed(3)),
    ratioAfter: Number(ratioAfter.toFixed(3)),
    deltaYou: Number(deltaYou.toFixed(3)),
    deltaOpp: Number(deltaOpp.toFixed(3))
});

    gameState.selectedPiece=null;
    gameState.selectedPieceIndex=-1;
    gameState.turn = prevTurn==='cyan'?'red':'cyan';
    turnDisplay.textContent=`${gameState.turn.charAt(0).toUpperCase()+gameState.turn.slice(1)}'s Turn`;
    showMessage('');
    updateGameReview();

    // AI move if red's turn
    if(gameState.turn==='red'){
        setTimeout(aiMove, 300); // small delay to see the move
    }

    // Check for no legal moves
    const moves = countLegalMoves(gameState.turn);
    if(moves===0){
        showMessage(`${prevTurn.charAt(0).toUpperCase()+prevTurn.slice(1)} wins! No legal moves left for ${gameState.turn}.`);
        disableAllPieces();
    }
}

// --- Disable all pieces ---
function disableAllPieces(){
    document.querySelectorAll('.piece').forEach(p=>p.draggable=false);
}

// --- Show message ---
function showMessage(msg){ messageArea.textContent=msg; }

// --- Controls (empty placeholders for rotation/flip) ---
// --- Rotate piece (90° clockwise) ---
rotateBtn.addEventListener('click', () => {
    if (gameState.selectedPiece) {
        const oldShape = gameState.selectedPiece.shape;
        const rotated = rotateMatrix(oldShape);
        gameState.selectedPiece.shape = rotated;
        renderPieces(); // refresh piece display
    }
});

// --- Flip piece (horizontal) ---
flipBtn.addEventListener('click', () => {
    if (gameState.selectedPiece) {
        const oldShape = gameState.selectedPiece.shape;
        const flipped = flipMatrix(oldShape);
        gameState.selectedPiece.shape = flipped;
        renderPieces(); // refresh piece display
    }
});

// --- Helpers for rotation & flip ---
function rotateMatrix(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated = Array.from({ length: cols }, () => Array(rows).fill(false));
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            rotated[c][rows - 1 - r] = matrix[r][c];
        }
    }
    return rotated;
}

function flipMatrix(matrix) {
    return matrix.map(row => [...row].reverse());
}


// --- Initialize game ---
createBoard();
gameState.cyanPieces = pieceShapes.map(shape=>({shape,player:'cyan'}));
gameState.redPieces = pieceShapes.map(shape=>({shape,player:'red'}));
renderPieces();
updateGameReview();
