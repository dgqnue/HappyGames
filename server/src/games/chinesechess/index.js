// server/src/games/chinesechess/index.js
const BaseGameManager = require('../../gamecore/BaseGameManager');
const ChineseChessRoom = require('./rooms/ChineseChessRoom');
const AutoMatchManager = require('../../gamecore/AutoMatchManager');

class ChineseChessManager extends BaseGameManager {
    constructor(io) {
        // 调用父类构造函数：io, 游戏类型, 游戏桌类
        super(io, 'chinesechess', ChineseChessRoom);

        // 创建自动匹配管理器
        this.autoMatcher = new AutoMatchManager();

        // 设置匹配成功回调
        this.autoMatcher.setMatchFoundHandler((gameType, players) => {
            this.handleMatchFound(players);
        });
    }

    /**
     * 处理自动匹配请求
     */
    handleAutoMatch(socket, matchSettings) {
        const result = this.autoMatcher.joinQueue(
            this.gameType,
            socket,
            matchSettings
        );

        if (result.success) {
            socket.emit('match_queue_joined', {
                message: '已加入匹配队列',
                queueInfo: this.autoMatcher.getQueueInfo(this.gameType)
            });
        } else {
            socket.emit('match_failed', { message: result.error });
        }
    }

    /**
     * 匹配成功处理
     */
    async handleMatchFound(players) {
        try {
            // 创建新游戏桌
            // 使用第一个玩家的底豆设置来决定游戏室等级，或者默认为 'free'
            const tier = 'free';
            const roomId = `${this.gameType}_match_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

            // 创建游戏桌实例 - ChineseChessRoom(io, roomId, tier)
            const room = new ChineseChessRoom(this.io, roomId, tier);

            // 将游戏桌添加到对应游戏室
            if (!this.rooms[tier]) {
                this.rooms[tier] = [];
            }
            this.rooms[tier].push(room);

            console.log(`[ChineseChess] Match found, created game table ${roomId} for ${players.length} players`);

            // 将玩家加入游戏桌
            for (const player of players) {
                const success = await room.playerJoin(player.socket, player.matchSettings);
                if (success) {
                    player.socket.emit('match_found', {
                        roomId: room.roomId,
                        message: '匹配成功！'
                    });
                } else {
                    console.error(`[ChineseChess] Failed to add matched player ${player.userId} to game table ${roomId}`);
                }
            }
        } catch (error) {
            console.error(`[ChineseChess] Error handling match found:`, error);
        }
    }

    /**
     * 玩家加入游戏管理器
     */
    onPlayerJoin(socket, user) {
        super.onPlayerJoin(socket, user);

        // 监听自动匹配请求
        socket.on('auto_match', (matchSettings) => {
            this.handleAutoMatch(socket, matchSettings);
        });

        // 监听取消匹配
        socket.on('cancel_match', () => {
            const userId = socket.user._id.toString();
            this.autoMatcher.leaveQueue(this.gameType, userId);
            socket.emit('match_cancelled');
        });
    }

    /**
     * 处理玩家断线
     */
    handleDisconnect(socket) {
        // 从匹配队列移除
        if (socket.user && socket.user._id) {
            this.autoMatcher.leaveQueue(this.gameType, socket.user._id.toString());
        }

        // 调用父类处理（处理游戏桌内断线）
        super.handleDisconnect(socket);
    }
}

module.exports = ChineseChessManager;
