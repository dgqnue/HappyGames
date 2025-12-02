/**
 * 游戏房间 (GameRoom)
 * 代表一个特定等级的游戏区域（如：初级室、高级室）
 * 
 * 主要职责：
 * 1. 管理该房间下的所有游戏桌 (GameTable)
 * 2. 处理玩家获取桌子列表的请求
 * 3. 维护该房间的准入规则
 */

const MatchPlayers = require('../matching/MatchPlayers');
const MatchingRules = MatchPlayers.MatchingRules;

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

        // 维护已释放的桌号池 (用于ID复用)
        this.freedIndices = [];
        this.nextIndex = 0;
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
        return MatchingRules.canAccessTier(playerRating, this.minRating, this.maxRating);
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
        let index;
        if (this.freedIndices.length > 0) {
            // 优先复用已释放的桌号 (从小到大)
            this.freedIndices.sort((a, b) => a - b);
            index = this.freedIndices.shift();
        } else {
            // 没有可复用的，使用新桌号
            index = this.nextIndex++;
        }

        // 桌号从1开始显示，所以 ID 后缀用 index + 1
        // 内部 index 从 0 开始
        const tableId = `${this.id}_${index + 1}`;
        const table = this.createTable(tableId, this.id);

        // 记录桌子的 index，方便释放时回收
        table.index = index;

        // 监听桌子销毁事件 (如果 GameTable 有 emit 'destroy' 的话)
        // 或者在 removeTable 时手动回收

        this.tables.push(table);
        return table;
    }

    /**
     * 移除游戏桌
     */
    removeTable(tableId) {
        const index = this.tables.findIndex(t => t.tableId === tableId);
        if (index !== -1) {
            const table = this.tables[index];
            // 回收桌号
            if (typeof table.index === 'number') {
                this.freedIndices.push(table.index);
                console.log(`[GameRoom] Recycled table index: ${table.index} (Table ID: ${tableId})`);
            }
            this.tables.splice(index, 1);
            return true;
        }
        return false;
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
        return this.tables.find(t => MatchingRules.isTableAvailable(t));
    }

    /**
     * 根据ID查找游戏桌
     */
    findTable(tableId) {
        return this.tables.find(t => t.tableId === tableId);
    }
}

module.exports = GameRoom;
