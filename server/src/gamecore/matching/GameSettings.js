/**
 * ============================================================================
 * GameSettings - 游戏配置管理器
 * ============================================================================
 * 
 * 定义不同游戏的配置（玩家数量、座位策略、观众支持等）。
 * 支持扩展到多人游戏配置。
 * 
 * 主要功能：
 * 1. 游戏配置定义（玩家数、座位策略、回合制等）
 * 2. 验证玩家数量是否有效
 * 3. 查询游戏特性（是否支持观众、团队等）
 * 4. 动态注册新游戏
 * 
 * 座位策略说明：
 * - sequential: 顺序分配（0,1,2...）- 适用于象棋、麻将
 * - balanced: 平衡分配（对面/对角）- 适用于扑克
 * - team: 团队配对（2v2, 3v3）- 适用于桥牌
 * - random: 随机分配 - 增加趣味性
 * 
 * 使用示例：
 *   const config = GameSettings.getConfig('chinesechess');
 *   console.log(config.maxPlayers); // 2
 *   
 *   if (GameSettings.isValidPlayerCount('poker', 4).valid) {
 *       // 4人扑克有效
 *   }
 * 
 * 文件位置: server/src/gamecore/matching/GameSettings.js
 */

class GameSettings {
    static {
        console.log('[GameSettings] 模块已加载 - Version 2.0 (重构版)');
    }

    // ========================================================================
    // 座位分配策略定义
    // ========================================================================

    /**
     * 座位分配策略
     */
    static SEAT_STRATEGIES = {
        SEQUENTIAL: 'sequential',    // 顺序分配：0,1,2,3...按入座顺序
        BALANCED: 'balanced',        // 平衡分配：尽量对面/对角分布
        TEAM: 'team',               // 团队配对：支持2v2或3v3
        RANDOM: 'random'            // 随机分配：增加趣味性
    };

    // ========================================================================
    // 游戏配置定义
    // ========================================================================

    /**
     * 游戏配置
     * 
     * 配置字段说明：
     * @property {string} name - 游戏名称（中文）
     * @property {number} minPlayers - 最小玩家数
     * @property {number} maxPlayers - 最大玩家数
     * @property {string} seatStrategy - 座位分配策略
     * @property {boolean} supportSpectators - 是否支持观众
     * @property {boolean} supportTeams - 是否支持团队模式
     * @property {boolean} roundBased - 是否是多轮游戏
     * @property {number} bestOf - 多轮游戏的轮数
     * @property {number} minReadyPlayers - 最少准备就绪的玩家数
     * @property {boolean} requireAllReady - 是否要求所有玩家准备
     * @property {number} readyTimeout - 准备倒计时（毫秒）
     * @property {number|null} roundTimeout - 回合倒计时（毫秒）
     */
    static GAME_CONFIGS = {
        /**
         * 中国象棋：经典2人游戏
         */
        chinesechess: {
            name: '中国象棋',
            minPlayers: 2,
            maxPlayers: 2,
            seatStrategy: 'sequential',
            supportSpectators: true,
            supportTeams: false,
            roundBased: false,
            bestOf: 1,
            minReadyPlayers: 2,
            requireAllReady: true,
            readyTimeout: 30000,
            roundTimeout: null
        },

        /**
         * 五子棋：经典2人游戏
         */
        gomoku: {
            name: '五子棋',
            minPlayers: 2,
            maxPlayers: 2,
            seatStrategy: 'sequential',
            supportSpectators: true,
            supportTeams: false,
            roundBased: false,
            bestOf: 1,
            minReadyPlayers: 2,
            requireAllReady: true,
            readyTimeout: 30000,
            roundTimeout: null
        },

        /**
         * 麻将：4人游戏，支持3人（1人缺席）
         */
        mahjong: {
            name: '麻将',
            minPlayers: 3,
            maxPlayers: 4,
            seatStrategy: 'sequential',
            supportSpectators: false,   // 麻将通常不支持观众
            supportTeams: false,
            roundBased: true,           // 多圈游戏
            bestOf: 8,                  // 8圈
            minReadyPlayers: 3,
            requireAllReady: false,     // 允许缺席1人
            readyTimeout: 30000,
            roundTimeout: 120000        // 每回合120秒
        },

        /**
         * 德州扑克：4-6人游戏
         */
        poker: {
            name: '德州扑克',
            minPlayers: 3,
            maxPlayers: 6,
            seatStrategy: 'balanced',
            supportSpectators: true,
            supportTeams: true,
            roundBased: true,
            bestOf: 10,
            minReadyPlayers: 3,
            requireAllReady: false,
            readyTimeout: 30000,
            roundTimeout: 180000
        }
    };

    // ========================================================================
    // 配置查询方法
    // ========================================================================

    /**
     * 获取游戏配置
     * @param {string} gameType - 游戏类型
     * @returns {Object|null} 游戏配置，不存在则返回 null
     */
    static getConfig(gameType) {
        return this.GAME_CONFIGS[gameType] || null;
    }

    /**
     * 验证玩家数量是否有效
     * @param {string} gameType - 游戏类型
     * @param {number} playerCount - 玩家数量
     * @returns {Object} { valid: boolean, reason: string }
     */
    static isValidPlayerCount(gameType, playerCount) {
        const config = this.getConfig(gameType);
        if (!config) {
            return { valid: false, reason: `未知的游戏类型: ${gameType}` };
        }

        if (playerCount < config.minPlayers) {
            return {
                valid: false,
                reason: `玩家数量过少。需要至少 ${config.minPlayers} 人，当前 ${playerCount} 人`
            };
        }

        if (playerCount > config.maxPlayers) {
            return {
                valid: false,
                reason: `玩家数量过多。最多 ${config.maxPlayers} 人，当前 ${playerCount} 人`
            };
        }

        return { valid: true, reason: '玩家数量有效' };
    }

    // ========================================================================
    // 特性查询方法
    // ========================================================================

    /**
     * 检查游戏是否需要满员才能开始
     * @param {string} gameType - 游戏类型
     * @returns {boolean}
     */
    static requiresFullPlayers(gameType) {
        const config = this.getConfig(gameType);
        return config && config.minPlayers === config.maxPlayers;
    }

    /**
     * 检查游戏是否支持观众
     * @param {string} gameType - 游戏类型
     * @returns {boolean}
     */
    static supportsSpectators(gameType) {
        const config = this.getConfig(gameType);
        return config && config.supportSpectators === true;
    }

    /**
     * 检查游戏是否支持团队模式
     * @param {string} gameType - 游戏类型
     * @returns {boolean}
     */
    static supportsTeams(gameType) {
        const config = this.getConfig(gameType);
        return config && config.supportTeams === true;
    }

    /**
     * 检查游戏是否为多轮制
     * @param {string} gameType - 游戏类型
     * @returns {boolean}
     */
    static isRoundBased(gameType) {
        const config = this.getConfig(gameType);
        return config && config.roundBased === true;
    }

    /**
     * 获取游戏的最大轮数
     * @param {string} gameType - 游戏类型
     * @returns {number}
     */
    static getBestOf(gameType) {
        const config = this.getConfig(gameType);
        return config ? config.bestOf : 1;
    }

    /**
     * 获取游戏的最小就绪玩家数
     * @param {string} gameType - 游戏类型
     * @returns {number}
     */
    static getMinReadyPlayers(gameType) {
        const config = this.getConfig(gameType);
        return config ? config.minReadyPlayers : config?.maxPlayers || 2;
    }

    /**
     * 检查游戏是否要求所有玩家准备
     * @param {string} gameType - 游戏类型
     * @returns {boolean}
     */
    static requiresAllReady(gameType) {
        const config = this.getConfig(gameType);
        return config ? config.requireAllReady : true;
    }

    /**
     * 获取游戏的准备超时时间
     * @param {string} gameType - 游戏类型
     * @returns {number} 毫秒
     */
    static getReadyTimeout(gameType) {
        const config = this.getConfig(gameType);
        if (!config || config.readyTimeout === 0) {
            return 30000;  // 默认30秒
        }
        return config.readyTimeout;
    }

    /**
     * 获取游戏的回合超时时间
     * @param {string} gameType - 游戏类型
     * @returns {number|null} 毫秒
     */
    static getRoundTimeout(gameType) {
        const config = this.getConfig(gameType);
        return config ? config.roundTimeout : null;
    }

    // ========================================================================
    // 座位策略方法
    // ========================================================================

    /**
     * 验证座位策略是否有效
     * @param {string} strategy - 座位策略
     * @returns {boolean}
     */
    static isValidSeatStrategy(strategy) {
        return Object.values(this.SEAT_STRATEGIES).includes(strategy);
    }

    /**
     * 获取推荐的玩家数量
     * @param {string} gameType - 游戏类型
     * @returns {number}
     */
    static getRecommendedPlayerCount(gameType) {
        const config = this.getConfig(gameType);
        if (!config) return 2;
        
        if (config.minPlayers === config.maxPlayers) {
            return config.maxPlayers;
        }
        return config.maxPlayers;
    }

    // ========================================================================
    // 信息和描述
    // ========================================================================

    /**
     * 获取游戏描述文本
     * @param {string} gameType - 游戏类型
     * @returns {string}
     */
    static getDescription(gameType) {
        const config = this.getConfig(gameType);
        if (!config) return '未知游戏';

        const { name, minPlayers, maxPlayers, bestOf } = config;
        
        if (minPlayers === maxPlayers) {
            return bestOf === 1 
                ? `${name}（${maxPlayers}人单局）`
                : `${name}（${maxPlayers}人 Best-of ${bestOf}）`;
        } else {
            return bestOf === 1
                ? `${name}（${minPlayers}-${maxPlayers}人单局）`
                : `${name}（${minPlayers}-${maxPlayers}人 Best-of ${bestOf}）`;
        }
    }

    // ========================================================================
    // 动态注册
    // ========================================================================

    /**
     * 注册新游戏配置
     * @param {string} gameType - 游戏类型
     * @param {Object} config - 游戏配置对象
     * @returns {boolean} 是否注册成功
     */
    static registerGame(gameType, config) {
        // 验证必要的配置字段
        const requiredFields = ['name', 'minPlayers', 'maxPlayers', 'seatStrategy'];
        const hasAllRequired = requiredFields.every(field => field in config);

        if (!hasAllRequired) {
            console.error(`[GameSettings] 注册游戏 ${gameType} 失败: 缺少必要配置字段`, requiredFields);
            return false;
        }

        // 验证座位策略
        if (!this.isValidSeatStrategy(config.seatStrategy)) {
            console.error(`[GameSettings] 注册游戏 ${gameType} 失败: 无效的座位策略 ${config.seatStrategy}`);
            return false;
        }

        // 验证玩家数量
        if (config.minPlayers > config.maxPlayers) {
            console.error(`[GameSettings] 注册游戏 ${gameType} 失败: minPlayers 不能大于 maxPlayers`);
            return false;
        }

        // 设置默认值
        const defaultConfig = {
            supportSpectators: false,
            supportTeams: false,
            roundBased: false,
            bestOf: 1,
            minReadyPlayers: config.minPlayers,
            requireAllReady: true,
            readyTimeout: 30000,
            roundTimeout: null
        };

        // 合并配置
        this.GAME_CONFIGS[gameType] = { ...defaultConfig, ...config };

        console.log(`[GameSettings] 游戏 ${gameType} 注册成功:`, this.GAME_CONFIGS[gameType]);
        return true;
    }

    /**
     * 获取所有已注册的游戏列表
     * @returns {Array<{gameType: string, config: Object, description: string}>}
     */
    static getAllGames() {
        return Object.entries(this.GAME_CONFIGS).map(([gameType, config]) => ({
            gameType,
            config,
            description: this.getDescription(gameType)
        }));
    }

    /**
     * 生成游戏信息汇总
     * @returns {string}
     */
    static getSummary() {
        const games = this.getAllGames();
        let summary = '\n[GameSettings] 已注册游戏:\n';
        
        games.forEach(({ gameType, config, description }) => {
            summary += `  ✓ ${description}\n`;
            summary += `    - 座位策略: ${config.seatStrategy}\n`;
            summary += `    - 观众支持: ${config.supportSpectators ? '是' : '否'}\n`;
            summary += `    - 团队模式: ${config.supportTeams ? '是' : '否'}\n`;
        });

        return summary;
    }
}

module.exports = GameSettings;
