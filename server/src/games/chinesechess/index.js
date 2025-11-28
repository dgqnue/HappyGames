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
            // 使用第一个玩家的底豆设置来决定游戏室等级，或者默认为 'free'
            const tier = 'free';

            // 1. 先查找现有的空闲游戏桌（idle 状态且无玩家）
            let room = null;
            const existingRooms = this.rooms[tier] || [];

            for (const existingRoom of existingRooms) {
                if (existingRoom.matchState.status === 'idle' && existingRoom.matchState.players.length === 0) {
                    // 检查是否符合双方的匹配条件
                    // 这里简化处理，假设空桌都可以使用
                    room = existingRoom;
                    console.log(`[ChineseChess] Reusing existing idle table ${room.roomId}`);
                    break;
                }
            }

            // 2. 如果没有空闲桌，创建新游戏桌
            if (!room) {
                // 查找最小的可用编号（填补删除游戏桌留下的空缺）
                const existingNumbers = existingRooms.map(r => {
                    const parts = r.roomId.split('_');
                    return parseInt(parts[parts.length - 1]);
                }).sort((a, b) => a - b);

                let nextNumber = 0;
                for (let i = 0; i < existingNumbers.length; i++) {
                    if (existingNumbers[i] !== i) {
                        nextNumber = i;
                        break;
                    }
                }
                // 如果所有编号都连续，使用下一个编号
                if (nextNumber === 0 && existingNumbers.length > 0 && existingNumbers[0] === 0) {
                    nextNumber = existingNumbers.length;
                }

                const roomId = `${this.gameType}_${tier}_${nextNumber}`;

                // 创建游戏桌实例
                room = new ChineseChessRoom(this.io, roomId, tier);
                room.gameManager = this; // 设置游戏管理器引用

                // 将游戏桌添加到对应游戏室
                if (!this.rooms[tier]) {
                    this.rooms[tier] = [];
                }
                this.rooms[tier].push(room);

                console.log(`[ChineseChess] Created new game table ${roomId} for matched players`);
            }

            // 3. 将玩家加入游戏桌
            for (const player of players) {
                const success = await room.playerJoin(player.socket, player.matchSettings);
                if (success) {
                    player.socket.emit('match_found', {
                        roomId: room.roomId,
                        message: '匹配成功！'
                    });
                } else {
                    console.error(`[ChineseChess] Failed to add matched player ${player.userId} to game table ${room.roomId}`);
                }
            }

            // 4. 匹配成功后直接开始游戏，跳过准备检查
            // 设置所有玩家为已准备
            room.matchState.players.forEach(p => p.ready = true);

            // 立即开始游戏
            setTimeout(() => {
                if (room.matchState.players.length === room.maxPlayers) {
                    console.log(`[ChineseChess] Auto-starting game for matched players in room ${room.roomId}`);
                    room.startGame();
                }
            }, 1000); // 1秒延迟，让客户端有时间准备

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
