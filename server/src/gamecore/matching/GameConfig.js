/**
 * ============================================================================
 * GameConfig.js - 游戏配置管理器
 * ============================================================================
 * 
 * 定义不同游戏的配置（玩家数量、座位策略、观众支持等）
 * 支持扩展到多人游戏配置
 * 
 * 使用示例：
 * const config = GameConfig.getConfig('mahjong');
 * if (GameConfig.isValidPlayerCount('poker', 4)) {
 *     // 4人扑克是有效的
 * }
 */

class GameConfig {
    static {
        console.log('[GameConfig] 模块已加载 - Version 1.0');
    }

    /**
     * 座位分配策略定义
     */
    static SEAT_STRATEGIES = {
        SEQUENTIAL: 'sequential',    // 顺序分配：座位0,1,2,3...按入座顺序分配（默认，麻将使用）
        BALANCED: 'balanced',        // 平衡分配：尽可能让玩家对面/对角分布（4-6人扑克使用）
        TEAM: 'team',               // 团队配对：支持2v2或3v3团队模式（高级，桥牌等使用）
        RANDOM: 'random'            // 随机分配：增加趣味性和公平性
    };

    /**
     * 游戏配置定义
     * 
     * 配置说明：
     * - name: 游戏名称
     * - minPlayers: 最小玩家数
     * - maxPlayers: 最大玩家数
     * - seatStrategy: 座位分配策略
     * - supportSpectators: 是否支持观众
     * - supportTeams: 是否支持团队模式
     * - roundBased: 是否是多轮游戏（如麻将的8圈）
     * - bestOf: 如果是多轮游戏，进行多少轮（Best-of N）
     * - minReadyPlayers: 最少准备就绪的玩家数（不是所有人都需要准备）
     * - requireAllReady: 是否要求所有玩家都准备（false时只需minReadyPlayers）
     * - readyTimeout: 准备倒计时（毫秒），如果为0则使用默认值
     * - roundTimeout: 每个回合的倒计时（多轮游戏）
     */
    static GAME_CONFIGS = {
        /**
         * 中国象棋：经典2人游戏
         */
        chinesechess: {
            name: '中国象棋',
            minPlayers: 2,
            maxPlayers: 2,
            seatStrategy: GameConfig.SEAT_STRATEGIES.SEQUENTIAL,
            supportSpectators: true,
            supportTeams: false,
            roundBased: false,  // 单局游戏
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
            seatStrategy: GameConfig.SEAT_STRATEGIES.SEQUENTIAL,
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
         * 麻将：4人游戏，支持3人（一人缺席情况）
         */
        mahjong: {
            name: '麻将',
            minPlayers: 3,              // 最少3人可开始（4人桌允许1人缺席）
            maxPlayers: 4,
            seatStrategy: GameConfig.SEAT_STRATEGIES.SEQUENTIAL,
            supportSpectators: false,   // 麻将通常不支持观众（涉及出牌信息）
            supportTeams: false,
            roundBased: true,           // 多圈游戏
            bestOf: 8,                  // 8圈（共32局）
            minReadyPlayers: 3,
            requireAllReady: false,     // 允许缺席1人
            readyTimeout: 30000,
            roundTimeout: 120000        // 每个回合120秒倒计时
        },

        /**
         * 德州扑克：4-6人游戏，支持3人
         */
        poker: {
            name: '德州扑克',
            minPlayers: 3,              // 最少3人可开始
            maxPlayers: 6,
            seatStrategy: GameConfig.SEAT_STRATEGIES.BALANCED,  // 平衡座位分布
            supportSpectators: true,    // 支持观众旁观
            supportTeams: true,         // 支持2v2或3v3团队模式
            roundBased: true,           // 多轮游戏
            bestOf: 10,                 // Best-of 10
            minReadyPlayers: 3,
            requireAllReady: false,
            readyTimeout: 30000,
            roundTimeout: 180000        // 每个回合180秒倒计时
        }

        // 在此添加更多游戏配置
        // 斗地主、升级、血战到底等...
    };

    /**
     * 获取游戏配置
     * 
     * @param {string} gameType - 游戏类型
     * @returns {Object|null} 游戏配置对象，如果游戏不存在返回 null
     */
    static getConfig(gameType) {
        return this.GAME_CONFIGS[gameType] || null;
    }

    /**
     * 验证玩家数量是否有效
     * 
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

    /**
     * 获取游戏是否需要人数满足才能开始
     * 
     * @param {string} gameType - 游戏类型
     * @returns {boolean} 如果需要人满才能开始返回 true
     */
    static requiresFullPlayers(gameType) {
        const config = this.getConfig(gameType);
        return config && config.minPlayers === config.maxPlayers;
    }

    /**
     * 获取游戏是否支持观众
     * 
     * @param {string} gameType - 游戏类型
     * @returns {boolean}
     */
    static supportsSpectators(gameType) {
        const config = this.getConfig(gameType);
        return config && config.supportSpectators === true;
    }

    /**
     * 获取游戏是否支持团队模式
     * 
     * @param {string} gameType - 游戏类型
     * @returns {boolean}
     */
    static supportsTeams(gameType) {
        const config = this.getConfig(gameType);
        return config && config.supportTeams === true;
    }

    /**
     * 检查游戏是否为多轮制
     * 
     * @param {string} gameType - 游戏类型
     * @returns {boolean}
     */
    static isRoundBased(gameType) {
        const config = this.getConfig(gameType);
        return config && config.roundBased === true;
    }

    /**
     * 获取游戏的最大可能轮数
     * 
     * @param {string} gameType - 游戏类型
     * @returns {number} Best-of N 中的 N 值
     */
    static getBestOf(gameType) {
        const config = this.getConfig(gameType);
        return config ? config.bestOf : 1;
    }

    /**
     * 获取游戏的最小就绪玩家数
     * 
     * @param {string} gameType - 游戏类型
     * @returns {number}
     */
    static getMinReadyPlayers(gameType) {
        const config = this.getConfig(gameType);
        return config ? config.minReadyPlayers : config.maxPlayers;
    }

    /**
     * 检查游戏是否要求所有玩家都准备
     * 
     * @param {string} gameType - 游戏类型
     * @returns {boolean}
     */
    static requiresAllReady(gameType) {
        const config = this.getConfig(gameType);
        return config ? config.requireAllReady : true;
    }

    /**
     * 获取游戏的准备倒计时时间
     * 
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
     * 获取游戏的回合倒计时时间
     * 
     * @param {string} gameType - 游戏类型
     * @returns {number|null} 毫秒，如果游戏不支持回合制返回 null
     */
    static getRoundTimeout(gameType) {
        const config = this.getConfig(gameType);
        return config ? config.roundTimeout : null;
    }

    /**
     * 验证座位策略是否有效
     * 
     * @param {string} strategy - 座位策略
     * @returns {boolean}
     */
    static isValidSeatStrategy(strategy) {
        return Object.values(this.SEAT_STRATEGIES).includes(strategy);
    }

    /**
     * 获取推荐的最小玩家数
     * 用于游戏宣传/推荐
     * 
     * @param {string} gameType - 游戏类型
     * @returns {number}
     */
    static getRecommendedPlayerCount(gameType) {
        const config = this.getConfig(gameType);
        if (!config) return 2;
        
        // 如果最少人数=最多人数（固定），返回该值
        if (config.minPlayers === config.maxPlayers) {
            return config.maxPlayers;
        }
        
        // 否则返回最多人数（体验最佳）
        return config.maxPlayers;
    }

    /**
     * 获取游戏的描述文本
     * 
     * @param {string} gameType - 游戏类型
     * @returns {string}
     */
    static getDescription(gameType) {
        const config = this.getConfig(gameType);
        if (!config) return '未知游戏';

        const { name, minPlayers, maxPlayers, bestOf } = config;
        
        if (minPlayers === maxPlayers) {
            if (bestOf === 1) {
                return `${name}（${maxPlayers}人单局）`;
            } else {
                return `${name}（${maxPlayers}人 Best-of ${bestOf}）`;
            }
        } else {
            if (bestOf === 1) {
                return `${name}（${minPlayers}-${maxPlayers}人单局）`;
            } else {
                return `${name}（${minPlayers}-${maxPlayers}人 Best-of ${bestOf}）`;
            }
        }
    }

    /**
     * 注册新游戏配置
     * 用于动态添加游戏（扩展性）
     * 
     * @param {string} gameType - 游戏类型
     * @param {Object} config - 游戏配置对象
     * @returns {boolean} 是否注册成功
     */
    static registerGame(gameType, config) {
        // 验证必要的配置字段
        const requiredFields = ['name', 'minPlayers', 'maxPlayers', 'seatStrategy'];
        const hasAllRequired = requiredFields.every(field => field in config);

        if (!hasAllRequired) {
            console.error(`[GameConfig] 注册游戏 ${gameType} 失败: 缺少必要配置字段`, requiredFields);
            return false;
        }

        // 验证座位策略有效性
        if (!this.isValidSeatStrategy(config.seatStrategy)) {
            console.error(`[GameConfig] 注册游戏 ${gameType} 失败: 无效的座位策略 ${config.seatStrategy}`);
            return false;
        }

        // 验证玩家数量范围有效性
        if (config.minPlayers > config.maxPlayers) {
            console.error(`[GameConfig] 注册游戏 ${gameType} 失败: minPlayers 不能大于 maxPlayers`);
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

        console.log(`[GameConfig] 游戏 ${gameType} 注册成功:`, this.GAME_CONFIGS[gameType]);
        return true;
    }

    /**
     * 获取所有已注册的游戏列表
     * 
     * @returns {Array<{gameType: string, config: Object}>}
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
     * 用于日志或调试
     * 
     * @returns {string}
     */
    static getSummary() {
        const games = this.getAllGames();
        let summary = '\n[GameConfig] 已注册游戏:\n';
        
        games.forEach(({ gameType, config, description }) => {
            summary += `  ✓ ${description}\n`;
            summary += `    - 座位策略: ${config.seatStrategy}\n`;
            summary += `    - 观众支持: ${config.supportSpectators ? '是' : '否'}\n`;
            summary += `    - 团队模式: ${config.supportTeams ? '是' : '否'}\n`;
        });

        return summary;
    }
}

// 导出模块
module.exports = GameConfig;
