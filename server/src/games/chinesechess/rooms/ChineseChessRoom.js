// server/src/games/chinesechess/rooms/ChineseChessRoom.js
const BaseGameRoom = require('../../../gamecore/BaseGameRoom');
const XiangqiRules = require('../logic/XiangqiRules');
const EloService = require('../../../gamecore/EloService');

class ChineseChessRoom extends BaseGameRoom {
    constructor(roomId, io, tier) {
        super(io, roomId);
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
        const userId = socket.user._id.toString();

        // Check if player is already in
        if (this.players.r === userId || this.players.b === userId) {
            return this.sendState(socket);
        }

        // Try to seat player
        if (!this.players.r) {
            this.players.r = userId;
        } else if (!this.players.b) {
            this.players.b = userId;
        } else {
            this.spectators.push(userId);
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
        const userId = socket.user._id.toString();

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

    /**
     * 玩家主动离开房间
     */
    leave(socket) {
        const userId = socket.user._id.toString();
        console.log(`[ChineseChess] Player ${socket.user.username} leaving room ${this.roomId}`);

        // 从房间中移除 socket
        socket.leave(this.roomId);

        // 从玩家列表中移除
        let wasPlayer = false;
        if (this.players.r === userId) {
            this.players.r = null;
            wasPlayer = true;
            console.log(`[ChineseChess] Removed player from Red position`);
        } else if (this.players.b === userId) {
            this.players.b = null;
            wasPlayer = true;
            console.log(`[ChineseChess] Removed player from Black position`);
        }

        // 从观众列表中移除
        const spectatorIndex = this.spectators.indexOf(userId);
        if (spectatorIndex > -1) {
            this.spectators.splice(spectatorIndex, 1);
            console.log(`[ChineseChess] Removed player from spectators`);
        }

        // 如果是游戏中的玩家离开，重置游戏
        if (wasPlayer && this.status === 'playing') {
            console.log(`[ChineseChess] Player left during game, resetting room`);
            this.resetGame();
        }

        // 如果房间空了，重置状态
        if (!this.players.r && !this.players.b && this.spectators.length === 0) {
            console.log(`[ChineseChess] Room is empty, resetting`);
            this.resetGame();
        }

        // 广播更新后的房间状态
        this.broadcastState();
    }

    /**
     * 处理玩家断线
     */
    handlePlayerDisconnect(socket) {
        const userId = socket.user._id.toString();
        console.log(`[ChineseChess] Player ${socket.user.username} disconnected from room ${this.roomId}`);

        // 检查是否是游戏中的玩家
        let wasPlayer = false;
        let playerSide = null;

        if (this.players.r === userId) {
            wasPlayer = true;
            playerSide = 'r';
        } else if (this.players.b === userId) {
            wasPlayer = true;
            playerSide = 'b';
        }

        // 如果是游戏中的玩家断线
        if (wasPlayer && this.status === 'playing') {
            console.log(`[ChineseChess] Player disconnected during game, opponent wins`);

            // 对手获胜
            const winner = playerSide === 'r' ? 'b' : 'r';
            this.endGame(winner);
        } else {
            // 非游戏中断线，直接清理
            this.leave(socket);
        }
    }
}

module.exports = ChineseChessRoom;

