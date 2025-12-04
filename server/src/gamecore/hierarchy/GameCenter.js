const UserGameStats = require('../../models/UserGameStats');

/**
 * 游戏中心基类 (GameCenter)
 * 这是一个抽象基类，只定义最基础的属性和方法
 * 具体的实现逻辑应该在子类中完成
 * 
 * 主要职责：
 * 1. 管理游戏房间集合
 * 2. 提供基础的用户统计数据获取
 * 3. 定义子类需要实现的接口
 */
class GameCenter {
    /**
     * @param {Object} io - Socket.IO 实例
     * @param {String} gameType - 游戏类型标识
     * @param {Class} TableClass - 游戏桌类定义
     * @param {Object} matchMaker - 匹配器实例
     */
    constructor(io, gameType, TableClass, matchMaker) {
        this.io = io;
        this.gameType = gameType;
        this.TableClass = TableClass;
        this.matchMaker = matchMaker;

        // 游戏房间列表 Map<roomType, GameRoom>
        this.gameRooms = new Map();

        // 初始化游戏房间（由子类实现）
        this.initGameRooms();

        // 注册匹配回调（如果有匹配器）
        if (this.matchMaker) {
            this.matchMaker.registerHandler(this.gameType, (players) => {
                this.handleMatchFound(players);
            });
        }
    }

    /**
     * 初始化游戏房间
     * 子类必须重写此方法
     */
    initGameRooms() {
        throw new Error('initGameRooms() must be implemented by subclass');
    }

    /**
     * 创建游戏房间
     * 子类必须重写此方法
     */
    createGameRoom(id, name, minRating, maxRating) {
        throw new Error('createGameRoom() must be implemented by subclass');
    }

    /**
     * 玩家进入游戏中心
     * 子类必须重写此方法以设置事件监听
     */
    playerJoinGameCenter(socket) {
        throw new Error('playerJoinGameCenter() must be implemented by subclass');
    }

    /**
     * 获取用户统计数据
     * @param {String} userId - 用户ID
     * @returns {Object} 用户统计数据
     */
    async getUserStats(userId) {
        let stats = await UserGameStats.findOne({ userId, gameType: this.gameType });
        if (!stats) {
            stats = { rating: 1200 }; // 默认值
        }
        return stats;
    }

    /**
     * 广播房间列表更新
     * @param {String} roomType - 房间类型
     */
    broadcastRoomList(roomType) {
        const gameRoom = this.gameRooms.get(roomType);
        if (gameRoom) {
            const broadcastRoom = `${this.gameType}_${roomType}`;
            this.io.to(broadcastRoom).emit('room_list', gameRoom.getTableList());
        }
    }

    // 以下方法应该在子类中实现：
    // handleGetRooms(socket, roomType) - 处理获取房间列表
    // handleJoinTable(socket, data) - 处理加入游戏桌
    // handleAutoMatch(socket, settings) - 处理自动匹配
    // handleCancelMatch(socket) - 处理取消匹配
    // handleMatchFound(players) - 处理匹配成功
    // setupTableListeners(socket, table) - 设置游戏桌监听
    // onPlayerDisconnect(socket) - 处理玩家断线
}

module.exports = GameCenter;
