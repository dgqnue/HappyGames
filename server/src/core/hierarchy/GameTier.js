/**
 * 游戏室 (GameTier)
 * 代表一个特定等级的游戏区域（如：初级室、高级室）
 * 
 * 主要职责：
 * 1. 管理该等级下的所有游戏桌
 * 2. 处理玩家获取桌子列表的请求
 * 3. 维护该等级的准入规则
 */
class GameTier {
    /**
     * @param {String} id - 游戏室ID (如: beginner)
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
     */
    setAccessRule(minRating, maxRating) {
        this.minRating = minRating;
        this.maxRating = maxRating;
    }

    /**
     * 检查玩家是否有权进入
     */
    canAccess(playerRating) {
        return playerRating >= this.minRating && playerRating <= this.maxRating;
    }

    /**
     * 初始化游戏桌
     * @param {Number} count - 初始数量
     */
    initTables(count) {
        for (let i = 0; i < count; i++) {
            this.addTable();
        }
    }

    /**
     * 添加新游戏桌
     */
    addTable() {
        const tableId = `${this.id}_${this.tables.length}`;
        const table = this.createTable(tableId, this.id);
        this.tables.push(table);
        return table;
    }

    /**
     * 获取游戏桌列表信息
     */
    getTableList() {
        return this.tables.map(table => ({
            id: table.tableId,
            status: table.status,
            players: table.players.length,
            spectators: table.spectators.length,
            maxPlayers: table.maxPlayers
        }));
    }

    /**
     * 查找可用游戏桌
     */
    findAvailableTable() {
        return this.tables.find(t => t.status === 'idle' && t.players.length < t.maxPlayers);
    }

    /**
     * 根据ID查找游戏桌
     */
    findTable(tableId) {
        return this.tables.find(t => t.tableId === tableId);
    }
}

module.exports = GameTier;
