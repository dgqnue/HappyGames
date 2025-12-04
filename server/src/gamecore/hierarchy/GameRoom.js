/**
 * 游戏房间基类 (GameRoom)
 * 代表一个特定等级的游戏区域（如：初级室、高级室）
 * 
 * 这是一个抽象基类，只定义最基础的属性和方法
 * 具体的实现逻辑应该在子类中完成
 */

class GameRoom {
    /**
     * @param {String} id - 游戏房间ID (如: beginner)
     * @param {String} name - 显示名称 (如: 初级室)
     * @param {Function} tableFactory - 创建游戏桌的工厂函数
     */
    constructor(id, name, tableFactory) {
        this.id = id;
        this.name = name;
        this.createTable = tableFactory;

        // 游戏桌列表
        this.tables = [];

        // 准入规则 (默认无限制)
        this.minRating = 0;
        this.maxRating = Infinity;
    }

    /**
     * 设置准入规则
     * @param {Number} minRating - 最低等级分
     * @param {Number} maxRating - 最高等级分
     */
    setAccessRule(minRating, maxRating) {
        this.minRating = minRating;
        this.maxRating = maxRating;
    }

    /**
     * 检查玩家是否有权进入
     * @param {Number} playerRating - 玩家等级分
     * @returns {Boolean} 是否可以进入
     */
    canAccess(playerRating) {
        return playerRating >= this.minRating && playerRating <= this.maxRating;
    }

    /**
     * 获取房间信息
     * @returns {Object} 房间基本信息
     */
    getRoomInfo() {
        return {
            id: this.id,
            name: this.name,
            minRating: this.minRating,
            maxRating: this.maxRating,
            tableCount: this.tables.length
        };
    }

    // 以下方法应该在子类中实现
    // initTables(count) - 初始化游戏桌
    // addTable() - 添加新游戏桌
    // removeTable(tableId) - 移除游戏桌
    // getTableList() - 获取游戏桌列表
    // findAvailableTable() - 查找可用游戏桌
    // findTable(tableId) - 根据ID查找游戏桌

    /**
     * 分配玩家到游戏桌
     * 子类必须重写此方法
     */
    assignPlayerToTable(socket, tableId) {
        throw new Error('assignPlayerToTable() must be implemented by subclass');
    }

    /**
     * 判断玩家是否可以入座
     * 子类必须重写此方法
     */
    canPlayerJoin(stats) {
        throw new Error('canPlayerJoin() must be implemented by subclass');
    }

    /**
     * 获取或创建游戏桌
     * 子类必须重写此方法
     */
    getOrCreateTable(tableId) {
        throw new Error('getOrCreateTable() must be implemented by subclass');
    }

    /**
     * 获取用户统计数据
     * 子类必须重写此方法
     */
    async getUserStats(userId) {
        throw new Error('getUserStats() must be implemented by subclass');
    }
}

module.exports = GameRoom;
