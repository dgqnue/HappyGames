const GameCenter = require('../../core/hierarchy/GameCenter');
const ChineseChessTable = require('./rooms/ChineseChessTable');
const ChineseChessRoom = require('./rooms/ChineseChessRoom');

/**
 * 中国象棋游戏中心 (ChineseChessCenter)
 * 继承自 GameCenter，负责管理所有中国象棋相关的游戏资源
 * 
 * 主要职责：
 * 1. 初始化中国象棋的各个游戏房间（免豆室、初级室等）
 * 2. 处理玩家进入象棋游戏中心的请求
 * 3. 协调匹配系统为象棋玩家匹配对手
 */
class ChineseChessCenter extends GameCenter {
    /**
     * @param {Object} io - Socket.IO 实例
     * @param {Object} matchMaker - 匹配器实例
     */
    constructor(io, matchMaker) {
        // 调用父类构造函数
        // 参数：io, 游戏类型标识, 游戏桌类, 匹配器
        super(io, 'chinesechess', ChineseChessTable, matchMaker);

        console.log('[ChineseChessCenter] 中国象棋游戏中心已初始化');
    }

    /**
     * 重写创建游戏房间方法
     * 使用 ChineseChessRoom 而不是通用的 GameRoom
     */
    createGameRoom(id, name, minRating, maxRating) {
        const gameRoom = new ChineseChessRoom(id, name, (tableId, roomType) => {
            // 工厂函数：创建象棋游戏桌实例
            const table = new this.TableClass(this.io, tableId, this.gameType, 2, roomType);
            table.gameCenter = this;
            return table;
        });

        gameRoom.setAccessRule(minRating, maxRating);
        gameRoom.initTables(3); // 默认创建3张桌子

        // 可以设置象棋特有的规则
        // gameRoom.setChessRules({
        //     timeLimit: 60,
        //     allowUndo: true,
        //     allowDraw: true
        // });

        this.gameRooms.set(id, gameRoom);
        console.log(`[ChineseChessCenter] 创建象棋房间: ${name} (${id})`);
    }

    /**
     * 重写初始化游戏房间方法
     * 可以自定义中国象棋的游戏房间配置
     */
    initGameRooms() {
        // 免豆室 - 无等级分限制
        this.createGameRoom('free', '免豆室', 0, Infinity);

        // 初级室 - 1500分以下
        this.createGameRoom('beginner', '初级室', 0, 1500);

        // 中级室 - 1500-1800分
        this.createGameRoom('intermediate', '中级室', 1500, 1800);

        // 高级室 - 1800分以上
        this.createGameRoom('advanced', '高级室', 1800, Infinity);

        console.log('[ChineseChessCenter] 游戏房间初始化完成');
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

module.exports = ChineseChessCenter;
