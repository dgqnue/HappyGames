const GameRoom = require('../../../gamecore/hierarchy/GameRoom');
const MatchPlayers = require('../../../gamecore/matching/MatchPlayers');
const MatchingRules = MatchPlayers.MatchingRules;
const UserGameStats = require('../../../models/UserGameStats');

/**
 * 中国象棋游戏房间 (ChineseChessRoom)
 * 继承自 GameRoom，代表一个特定等级的象棋游戏区域
 * 
 * 主要职责：
 * 1. 管理该房间下的所有象棋游戏桌
 * 2. 处理象棋特有的房间级别逻辑
 * 3. 可以添加象棋特定的房间配置和规则
 */
class ChineseChessRoom extends GameRoom {
    /**
     * @param {String} id - 游戏房间ID (如: beginner)
     * @param {String} name - 显示名称 (如: 初级室)
     * @param {Function} tableFactory - 创建游戏桌的工厂函数
     */
    constructor(id, name, tableFactory) {
        super(id, name, tableFactory);

        // 象棋特有的房间配置
        this.gameType = 'chinesechess';

        // 可以添加象棋特有的房间设置
        // 例如：时间限制、特殊规则等
        this.timeLimit = null; // 每步时间限制（秒）
        this.allowUndo = true; // 是否允许悔棋
        this.allowDraw = true; // 是否允许求和

        // 维护已释放的桌号池 (用于ID复用)
        this.freedIndices = [];
        this.nextIndex = 0;

        console.log(`[ChineseChessRoom] 创建象棋房间: ${name} (${id})`);
    }

    /**
     * 设置象棋特有的房间规则
     * @param {Object} rules - 规则配置
     */
    setChessRules(rules) {
        if (rules.timeLimit !== undefined) {
            this.timeLimit = rules.timeLimit;
        }
        if (rules.allowUndo !== undefined) {
            this.allowUndo = rules.allowUndo;
        }
        if (rules.allowDraw !== undefined) {
            this.allowDraw = rules.allowDraw;
        }

        console.log(`[ChineseChessRoom] ${this.name} 规则已更新:`, {
            timeLimit: this.timeLimit,
            allowUndo: this.allowUndo,
            allowDraw: this.allowDraw
        });
    }

    /**
     * 初始化游戏桌
     * @param {Number} count - 初始数量
     */
    initTables(count) {
        for (let i = 0; i < count; i++) {
            this.addTable();
        }
        console.log(`[ChineseChessRoom] ${this.name} 已初始化 ${count} 张象棋桌`);
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

        this.tables.push(table);
        return table;
    }

    /**
     * 移除游戏桌
     * @param {String} tableId - 桌子ID
     * @returns {Boolean} 是否成功移除
     */
    removeTable(tableId) {
        const index = this.tables.findIndex(t => t.tableId === tableId);
        if (index !== -1) {
            const table = this.tables[index];
            // 回收桌号
            if (typeof table.index === 'number') {
                this.freedIndices.push(table.index);
                console.log(`[ChineseChessRoom] 回收桌号: ${table.index} (桌子ID: ${tableId})`);
            }
            this.tables.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * 获取游戏桌列表信息
     * @returns {Array} 桌子列表
     */
    getTableList() {
        const tableList = this.tables.map(table => ({
            tableId: table.tableId,
            status: table.status,
            playerCount: table.players.length,
            spectators: table.spectators.length,
            maxPlayers: table.maxPlayers,
            players: table.players.map(p => ({
                userId: p.user?._id?.toString(),
                username: p.user?.username,
                nickname: p.user?.nickname,
                piUsername: p.user?.piUsername,
                avatar: p.user?.avatar,
                title: p.title || '初出茅庐',
                titleColor: p.titleColor || '#666',
                ready: p.ready || false,
                seatIndex: p.seatIndex
            }))
        }));

        console.log('[ChineseChessRoom] getTableList returning:', JSON.stringify(tableList, null, 2));
        return tableList;
    }

    /**
     * 查找可用游戏桌
     * @returns {Object|undefined} 可用的桌子或undefined
     */
    findAvailableTable() {
        return this.tables.find(t => MatchingRules.isTableAvailable(t));
    }

    /**
     * 根据ID查找游戏桌
     * @param {String} tableId - 桌子ID
     * @returns {Object|undefined} 桌子对象或undefined
     */
    findTable(tableId) {
        return this.tables.find(t => t.tableId === tableId);
    }

    /**
     * 获取房间信息（包含象棋特有信息）
     * @returns {Object} 房间信息
     */
    getRoomInfo() {
        const baseInfo = super.getRoomInfo();

        const totalPlayers = this.tables.reduce((sum, t) => sum + t.players.length, 0);

        return {
            ...baseInfo,
            playerCount: totalPlayers,
            gameType: this.gameType,
            rules: {
                timeLimit: this.timeLimit,
                allowUndo: this.allowUndo,
                allowDraw: this.allowDraw
            }
        };
    }

    /**
     * 检查玩家是否可以进入房间
     * 可以添加象棋特有的准入检查
     * @param {Number} playerRating - 玩家等级分
     * @param {Object} playerStats - 玩家统计数据（可选）
     * @returns {Boolean} 是否可以进入
     */
    canAccess(playerRating, playerStats = null) {
        // 首先检查基本的等级分要求
        if (!super.canAccess(playerRating)) {
            return false;
        }

        // 可以添加象棋特有的准入条件
        // 例如：检查玩家是否完成了新手教程
        // if (playerStats && !playerStats.tutorialCompleted) {
        //     return false;
        // }

        return true;
    }

    /**
     * 分配玩家到游戏桌
     * 继承基类实现，可选：添加象棋特有的验证
     * @param {Object} socket - Socket 实例
     * @param {String} tableId - 指定的桌子ID（可选）
     */
    async assignPlayerToTable(socket, tableId) {
        // 直接调用基类实现，基类已处理所有检查和状态管理
        return await super.assignPlayerToTable(socket, tableId);
    }

    /**
     * 验证玩家是否可以加入（可选：扩展基类的验证）
     * @param {Object} stats - 玩家统计数据
     * @param {Object} socket - Socket 实例
     * @returns {Object} { success: boolean, reason?: string }
     */
    async validatePlayerJoin(stats, socket) {
        // 1. 先执行基类的基础验证（积分、掉线率等）
        const baseValidation = await super.validatePlayerJoin(stats, socket);
        if (!baseValidation.success) {
            return baseValidation;
        }

        // 2. 可以在这里添加象棋特有的验证
        // 例如：检查玩家是否完成了新手教程
        // if (stats.tutorialCompleted === false) {
        //     return {
        //         success: false,
        //         reason: '请先完成新手教程'
        //     };
        // }

        // 3. 检查欢乐豆（如果房间有要求）
        // if (this.requiredBeans && stats.beans < this.requiredBeans) {
        //     return {
        //         success: false,
        //         reason: `您的欢乐豆不足（需要 ${this.requiredBeans}，当前 ${stats.beans}）`
        //     };
        // }

        return { success: true };
    }

    /**
     * 获取或创建游戏桌
     * @param {String} tableId - 指定的桌子ID（可选）
     */
    getOrCreateTable(tableId) {
        // 如果指定了 tableId，查找指定的桌子
        if (tableId) {
            const table = this.findTable(tableId);
            if (!table) {
                throw new Error('游戏桌不存在');
            }
            return table;
        }

        // 没有指定，查找可用的桌子
        let table = this.findAvailableTable();

        // 如果没有可用的，创建新桌子
        if (!table) {
            table = this.addTable();
        }

        return table;
    }

    /**
     * 获取用户统计数据
     * @param {String} userId - 用户ID
     */
    async getUserStats(userId) {
        const stats = await UserGameStats.findOne({
            userId: userId,
            gameType: this.gameType
        });

        return {
            rating: stats?.rating || 1200,
            gamesPlayed: stats?.gamesPlayed || 0,
            wins: stats?.wins || 0,
            disconnects: stats?.disconnects || 0,
            beans: stats?.beans || 0  // 欢乐豆
        };
    }
}

module.exports = ChineseChessRoom;
