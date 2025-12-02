const GameRoom = require('../../../core/hierarchy/GameRoom');

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
     * 获取房间信息（包含象棋特有信息）
     * @returns {Object} 房间信息
     */
    getRoomInfo() {
        const baseInfo = super.getRoomInfo();

        return {
            ...baseInfo,
            gameType: this.gameType,
            rules: {
                timeLimit: this.timeLimit,
                allowUndo: this.allowUndo,
                allowDraw: this.allowDraw
            }
        };
    }

    /**
     * 可以重写或扩展父类的方法
     * 例如：添加象棋特有的桌子初始化逻辑
     */
    initTables(count) {
        super.initTables(count);

        // 可以在这里添加象棋特有的初始化逻辑
        console.log(`[ChineseChessRoom] ${this.name} 已初始化 ${count} 张象棋桌`);
    }

    /**
     * 检查玩家是否可以进入房间
     * 可以添加象棋特有的准入检查
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
}

module.exports = ChineseChessRoom;
