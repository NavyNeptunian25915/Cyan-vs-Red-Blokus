// AI.js - Strong Minimax + Alpha-Beta AI for Red vs Blue Blokus

// ---------------------------
// BOARD & MOVE LOGIC
// ---------------------------

// Check if a move is legal
function isLegalMove(board, move, player) {
    const size = board.length;
    let touchesCorner = false;

    for (let i = 0; i < move.shape.length; i++) {
        for (let j = 0; j < move.shape[i].length; j++) {
            if (move.shape[i][j] === 1) {
                let xi = move.x + i;
                let yj = move.y + j;

                if (xi < 0 || xi >= size || yj < 0 || yj >= size) return false;
                if (board[xi][yj] !== null) return false;

                const corners = [
                    [xi-1, yj-1], [xi-1, yj+1], [xi+1, yj-1], [xi+1, yj+1]
                ];
                for (let [cx, cy] of corners) {
                    if (cx >= 0 && cx < size && cy >= 0 && cy < size) {
                        if (board[cx][cy] === player) touchesCorner = true;
                    }
                }
            }
        }
    }

    const firstMoveCorners = { red: [[0,0]], blue: [[size-1,size-1]] };
    const isFirstMove = board.flat().every(cell => cell === null);
    if (isFirstMove) {
        for (let [cx, cy] of firstMoveCorners[player]) {
            if (move.x === cx && move.y === cy) return true;
        }
        return false;
    }

    return touchesCorner;
}

// Generate all legal moves
function generateLegalMoves(board, player, pieces) {
    const moves = [];
    const size = board.length;

    for (let piece of pieces) {
        const shapeSize = piece.length;
        for (let x = 0; x <= size - shapeSize; x++) {
            for (let y = 0; y <= size - shapeSize; y++) {
                const move = {x, y, shape: piece};
                if (isLegalMove(board, move, player)) moves.push(move);
            }
        }
    }
    return moves;
}

// Apply a move
function applyMove(board, move, player) {
    const newBoard = board.map(row => row.slice());
    for (let i = 0; i < move.shape.length; i++) {
        for (let j = 0; j < move.shape[i].length; j++) {
            if (move.shape[i][j] === 1) {
                newBoard[move.x+i][move.y+j] = player;
            }
        }
    }
    return newBoard;
}

// Check if player has legal moves
function hasLegalMoves(board, player, pieces) {
    return generateLegalMoves(board, player, pieces).length > 0;
}

// ---------------------------
// HEURISTIC EVALUATION
// ---------------------------

// Heuristic: maximize own moves, minimize opponent moves
function evaluateBoard(board, player, pieces) {
    const opponent = player === 'red' ? 'blue' : 'red';
    const myMoves = generateLegalMoves(board, player, pieces).length;
    const oppMoves = generateLegalMoves(board, opponent, pieces).length;
    return myMoves - oppMoves;
}

// ---------------------------
// MINIMAX + ALPHA-BETA
// ---------------------------

function minimax(board, player, pieces, depth, alpha, beta, maximizingPlayer) {
    if (depth === 0) return evaluateBoard(board, player, pieces);

    const opponent = player === 'red' ? 'blue' : 'red';
    const legalMoves = generateLegalMoves(board, maximizingPlayer ? player : opponent, pieces);

    if (legalMoves.length === 0) {
        // No moves: opponent wins
        return maximizingPlayer ? -1000 : 1000;
    }

    if (maximizingPlayer) {
        let maxEval = -Infinity;
        for (let move of legalMoves) {
            const newBoard = applyMove(board, move, player);
            const evalScore = minimax(newBoard, player, pieces, depth-1, alpha, beta, false);
            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break; // alpha-beta pruning
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let move of legalMoves) {
            const newBoard = applyMove(board, move, opponent);
            const evalScore = minimax(newBoard, player, pieces, depth-1, alpha, beta, true);
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

// Find best move using Minimax + Alpha-Beta
function findBestMove(board, player, pieces, depth=2) {
    const legalMoves = generateLegalMoves(board, player, pieces);
    if (legalMoves.length === 0) return null;

    let bestScore = -Infinity;
    let bestMove = null;

    for (let move of legalMoves) {
        const newBoard = applyMove(board, move, player);
        const score = minimax(newBoard, player, pieces, depth-1, -Infinity, Infinity, false);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    return bestMove;
}

// AI turn
function makeAITurn(board, player, pieces, depth=2) {
    if (!hasLegalMoves(board, player, pieces)) {
        const winner = player === 'red' ? 'blue' : 'red';
        return {board, winner};
    }

    const move = findBestMove(board, player, pieces, depth);
    if (!move) {
        const winner = player === 'red' ? 'blue' : 'red';
        return {board, winner};
    }

    const newBoard = applyMove(board, move, player);
    return {board: newBoard, winner: null};
}

// ---------------------------
// EXPORTS
// ---------------------------

export {
    isLegalMove,
    generateLegalMoves,
    applyMove,
    hasLegalMoves,
    findBestMove,
    evaluateBoard,
    makeAITurn
};
