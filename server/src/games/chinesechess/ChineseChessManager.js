const GameManager = require('../../core/hierarchy/GameManager');
const ChineseChessRoom = require('./rooms/ChineseChessRoom');

/**
 * 中国象棋游戏管理器
 * 继承自 GameManager，负责管理所有中国象棋相关的游戏资源
 * 
 * 主要职责：
 * 1. 初始化中国象棋的各个游戏室（免豆室、初级室等）
 * 2. 处理玩家进入象棋游戏的请求
 * 3. 协调匹配系统为象棋玩家匹配对手
 */
class ChineseChessManager extends GameManager {
    /**
     * @param {Object} io - Socket.IO 实例
     * @param {Object} matchMaker - 匹配器实例
     */
    constructor(io, matchMaker) {
        // 调用父类构造函数
        // 参数：io, 游戏类型标识, 游戏桌类, 匹配器
        super(io, 'chinesechess', ChineseChessRoom, matchMaker);

        console.log('[ChineseChessManager] 中国象棋管理器已初始化');
    }

    /**
     * 重写初始化游戏室方法
     * 可以自定义中国象棋的游戏室配置
     */
    initTiers() {
        // 免豆室 - 无等级分限制
        this.createTier('free', '免豆室', 0, Infinity);

        // 初级室 - 1500分以下
        this.createTier('beginner', '初级室', 0, 1500);

        // 中级室 - 1500-1800分
        this.createTier('intermediate', '中级室', 1500, 1800);

        // 高级室 - 1800分以上
        this.createTier('advanced', '高级室', 1800, Infinity);

        console.log('[ChineseChessManager] 游戏室初始化完成');
    }

    /**
     * 可以重写处理玩家加入的逻辑
     * 添加中国象棋特有的事件监听
     */
    onPlayerJoin(socket) {
        // 调用父类的通用处理
        super.onPlayerJoin(socket);

        // 这里可以添加中国象棋特有的事件监听
        // 例如：悔棋、求和等
        socket.on('request_undo', () => {
            // TODO: 实现悔棋逻辑
            console.log('[ChineseChess] 玩家请求悔棋');
        });

        socket.on('request_draw', () => {
            // TODO: 实现求和逻辑
            console.log('[ChineseChess] 玩家请求求和');
        });
    }
}

module.exports = ChineseChessManager;
