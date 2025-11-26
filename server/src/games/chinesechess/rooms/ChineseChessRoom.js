// server/src/games/chinesechess/rooms/ChineseChessRoom.js
const BaseGameRoom = require('../../../gamecore/BaseGameRoom');
const XiangqiRules = require('../logic/XiangqiRules');
const EloService = require('../../../gamecore/EloService');

class ChineseChessRoom extends BaseGameRoom {
    constructor(roomId, io, tier) {
        super(roomId, io);
        this.tier = tier; // 'free', 'beginner', 'intermediate', 'advanced'
        this.gameType = 'chinesechess';
        this.resetGame();
    }

    resetGame() {
        // Standard Starting Position (Red at bottom, Black at top)
        // r n b a k a b n r
        // . . . . . . . . .
        // . c . . . . . c .
        // p . p . p . p . p
        // . . . . . . . . .
        // . . . . . . . . .
        // P . P . P . P . P
        // . C . . . . . C .
        // . . . . . . . . .
        // R N B A K A B N R

        this.board = [
            ['r', 'n', 'b', 'a', 'k', 'a', 'b', 'n', 'r'],
            [null, null, null, null, null, null, null, null, null],
            [null, 'c', null, null, null, null, null, 'c', null],
            ['p', null, 'p', null, 'p', null, 'p', null, 'p'],
            [null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null],
            ['P', null, 'P', null, 'P', null, 'P', null, 'P'],
            [null, 'C', null, null, null, null, null, 'C', null],
            [null, null, null, null, null, null, null, null, null],
            ['R', 'N', 'B', 'A', 'K', 'A', 'B', 'N', 'R']
        ];

        this.turn = 'r'; // Red goes first
        this.status = 'waiting'; // waiting, playing, ended
        this.players = { r: null, b: null }; // r: Red Player ID, b: Black Player ID
        this.spectators = [];
        this.history = [];
    }

    async join(socket) {
        // Check if player is already in
        if (this.players.r === socket.user.id || this.players.b === socket.user.id) {
            return this.sendState(socket);
        }

        // Try to seat player
        if (!this.players.r) {
            this.players.r = socket.user.id;
        } else if (!this.players.b) {
            this.players.b = socket.user.id;
        } else {
            this.spectators.push(socket.user.id);
        }

        socket.join(this.roomId);
        this.broadcastState();

        // Check start condition
        if (this.players.r && this.players.b && this.status === 'waiting') {
            this.startGame();
        }
    }

    startGame() {
        this.status = 'playing';
        this.broadcast('game_start', {
            players: this.players,
            turn: this.turn
        });
    }

    handleMove(socket, move) {
        if (this.status !== 'playing') return;

        const { fromX, fromY, toX, toY } = move;
        const userId = socket.user.id;

        // Validate Turn
        const side = this.players.r === userId ? 'r' : (this.players.b === userId ? 'b' : null);
        if (!side || side !== this.turn) return;

        // Validate Move Logic
        if (!XiangqiRules.isValidMoveV2(this.board, fromX, fromY, toX, toY, this.turn)) {
            socket.emit('error', { message: 'Invalid Move' });
            return;
        }

        // Execute Move
        const piece = this.board[fromY][fromX];
        const captured = this.board[toY][toX];

        this.board[toY][toX] = piece;
        this.board[fromY][fromX] = null;

        this.history.push({ ...move, piece, captured });

        // Check Win Condition (King Captured)
        // Note: Standard rules say checkmate, but capturing King is the ultimate end if checkmate logic is complex.
        // For simplicity in V1, if King is captured (though rules usually prevent moving into check), game ends.
        // Or if we implement strict checkmate detection later.
        // Let's check if 'k' or 'K' is missing from board? 
        // Actually, isValidMove prevents capturing own, so if we captured opponent King:
        if (captured && captured.toLowerCase() === 'k') {
            this.endGame(side); // Current side wins
            return;
        }

        // Switch Turn
        this.turn = this.turn === 'r' ? 'b' : 'r';

        this.broadcast('move', {
            move,
            turn: this.turn,
            board: this.board // Optional: send full board or just delta
        });
    }

    async endGame(winnerSide) {
        this.status = 'ended';
        const winnerId = this.players[winnerSide];
        const loserId = this.players[winnerSide === 'r' ? 'b' : 'r'];

        // 1. ELO Settlement
        const eloResult = await EloService.processMatchResult(
            this.gameType,
            winnerId,
            loserId,
            1 // Winner gets 1 point
        );

        // 2. Bean Settlement (If not free room)
        if (this.tier !== 'free') {
            // Calculate amount based on room rules (e.g., fixed bet or dynamic)
            // For now, assume fixed bet based on tier?
            // User said: "Bottom beans 100 - 100000". 
            // Let's assume a standard bet for the room for now.
            const betAmount = this.getBetAmount();
            await this.settle({
                winner: winnerId,
                loser: loserId,
                amount: betAmount
            });
        }

        this.broadcast('game_over', {
            winner: winnerSide,
            elo: eloResult
        });

        // Reset after delay?
        setTimeout(() => this.resetGame(), 5000);
    }

    getBetAmount() {
        switch (this.tier) {
            case 'beginner': return 100;
            case 'intermediate': return 1000;
            case 'advanced': return 10000;
            default: return 0;
        }
    }

    broadcastState() {
        this.broadcast('state', {
            board: this.board,
            turn: this.turn,
            status: this.status,
            players: this.players
        });
    }

    sendState(socket) {
        socket.emit('state', {
            board: this.board,
            turn: this.turn,
            status: this.status,
            players: this.players
        });
    }
}

module.exports = ChineseChessRoom;
