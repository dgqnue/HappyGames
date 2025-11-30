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
     * 使用父类的通用匹配逻辑
     */
    async handleMatchFound(players) {
        // 调用父类的模板方法
        // 可以传入自定义的 tier，这里使用默认的 'free'
        await super.handleMatchFound(players, 'free');
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
