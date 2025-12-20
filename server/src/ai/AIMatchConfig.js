/**
 * AI 匹配配置模块 (AIMatchConfig)
 * 
 * 提供 AI 匹配功能的全局开关和游戏级别配置。
 * 设计为模块化，可在不同游戏中复用。
 * 
 * 使用方法：
 * const AIMatchConfig = require('./AIMatchConfig');
 * 
 * // 检查是否启用 AI 匹配
 * if (AIMatchConfig.isEnabled('chinesechess')) {
 *     // 执行 AI 匹配逻辑
 * }
 * 
 * // 动态开关
 * AIMatchConfig.setGlobalEnabled(false);  // 全局关闭
 * AIMatchConfig.setGameEnabled('chinesechess', false);  // 单个游戏关闭
 */

class AIMatchConfig {
    constructor() {
        // ========== 全局开关 ==========
        // 设置为 false 可完全禁用所有游戏的 AI 匹配
        this.globalEnabled = true;
        
        // ========== 游戏级别配置 ==========
        // 每个游戏可以有独立的 AI 匹配配置
        this.gameConfigs = new Map();
        
        // 默认配置（新游戏如果没有单独配置，使用此默认值）
        this.defaultConfig = {
            enabled: true,                    // 是否启用 AI 匹配
            tableMatchEnabled: true,          // 游戏桌级别 AI 匹配（玩家入座后等待 AI）
            quickMatchEnabled: true,          // 快速匹配级别 AI 匹配（队列超时匹配 AI）
            tableMatchDelay: 10000,           // 游戏桌 AI 匹配延迟（毫秒）
            quickMatchDelay: 10000,           // 快速匹配 AI 匹配延迟（毫秒）
            aiLeaveOnHumanLeave: true,        // 人类离开时 AI 是否自动离开
            aiRematchProbability: 0.7,        // AI 再来一局的概率 (0-1)
            ratingTolerance: 200,             // AI 匹配的分数容差
        };
        
        // 初始化已知游戏的配置
        this._initGameConfigs();
    }
    
    /**
     * 初始化各游戏的 AI 匹配配置
     * 新增游戏时，在此添加配置
     */
    _initGameConfigs() {
        // 中国象棋配置
        this.gameConfigs.set('chinesechess', {
            enabled: true,
            tableMatchEnabled: true,
            quickMatchEnabled: true,
            tableMatchDelay: 10000,      // 10秒后匹配 AI
            quickMatchDelay: 10000,      // 10秒后匹配 AI
            aiLeaveOnHumanLeave: true,
            aiRematchProbability: 0.7,
            ratingTolerance: 200,
        });
        
        // 示例：其他游戏配置（未来扩展）
        // this.gameConfigs.set('gomoku', {
        //     enabled: true,
        //     tableMatchEnabled: true,
        //     quickMatchEnabled: true,
        //     tableMatchDelay: 8000,
        //     quickMatchDelay: 8000,
        //     aiLeaveOnHumanLeave: true,
        //     aiRematchProbability: 0.5,
        //     ratingTolerance: 150,
        // });
    }
    
    // ========== 查询方法 ==========
    
    /**
     * 检查指定游戏的 AI 匹配是否启用
     * @param {string} gameType - 游戏类型
     * @returns {boolean}
     */
    isEnabled(gameType) {
        if (!this.globalEnabled) return false;
        const config = this.getGameConfig(gameType);
        return config.enabled;
    }
    
    /**
     * 检查游戏桌级别 AI 匹配是否启用
     * @param {string} gameType - 游戏类型
     * @returns {boolean}
     */
    isTableMatchEnabled(gameType) {
        if (!this.globalEnabled) return false;
        const config = this.getGameConfig(gameType);
        return config.enabled && config.tableMatchEnabled;
    }
    
    /**
     * 检查快速匹配级别 AI 匹配是否启用
     * @param {string} gameType - 游戏类型
     * @returns {boolean}
     */
    isQuickMatchEnabled(gameType) {
        if (!this.globalEnabled) return false;
        const config = this.getGameConfig(gameType);
        return config.enabled && config.quickMatchEnabled;
    }
    
    /**
     * 获取游戏桌 AI 匹配延迟
     * @param {string} gameType - 游戏类型
     * @returns {number} 延迟毫秒数
     */
    getTableMatchDelay(gameType) {
        const config = this.getGameConfig(gameType);
        return config.tableMatchDelay;
    }
    
    /**
     * 获取快速匹配 AI 匹配延迟
     * @param {string} gameType - 游戏类型
     * @returns {number} 延迟毫秒数
     */
    getQuickMatchDelay(gameType) {
        const config = this.getGameConfig(gameType);
        return config.quickMatchDelay;
    }
    
    /**
     * 获取 AI 分数匹配容差
     * @param {string} gameType - 游戏类型
     * @returns {number}
     */
    getRatingTolerance(gameType) {
        const config = this.getGameConfig(gameType);
        return config.ratingTolerance;
    }
    
    /**
     * 获取 AI 再来一局概率
     * @param {string} gameType - 游戏类型
     * @returns {number}
     */
    getRematchProbability(gameType) {
        const config = this.getGameConfig(gameType);
        return config.aiRematchProbability;
    }
    
    /**
     * 检查人类离开时 AI 是否应该离开
     * @param {string} gameType - 游戏类型
     * @returns {boolean}
     */
    shouldAILeaveOnHumanLeave(gameType) {
        const config = this.getGameConfig(gameType);
        return config.aiLeaveOnHumanLeave;
    }
    
    /**
     * 获取指定游戏的完整配置
     * @param {string} gameType - 游戏类型
     * @returns {Object} 配置对象
     */
    getGameConfig(gameType) {
        if (this.gameConfigs.has(gameType)) {
            return { ...this.defaultConfig, ...this.gameConfigs.get(gameType) };
        }
        return { ...this.defaultConfig };
    }
    
    // ========== 设置方法 ==========
    
    /**
     * 设置全局开关
     * @param {boolean} enabled
     */
    setGlobalEnabled(enabled) {
        this.globalEnabled = enabled;
        console.log(`[AIMatchConfig] Global AI matching ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }
    
    /**
     * 设置指定游戏的 AI 匹配开关
     * @param {string} gameType - 游戏类型
     * @param {boolean} enabled
     */
    setGameEnabled(gameType, enabled) {
        const config = this.gameConfigs.get(gameType) || { ...this.defaultConfig };
        config.enabled = enabled;
        this.gameConfigs.set(gameType, config);
        console.log(`[AIMatchConfig] AI matching for ${gameType} ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }
    
    /**
     * 设置游戏桌级别 AI 匹配开关
     * @param {string} gameType - 游戏类型
     * @param {boolean} enabled
     */
    setTableMatchEnabled(gameType, enabled) {
        const config = this.gameConfigs.get(gameType) || { ...this.defaultConfig };
        config.tableMatchEnabled = enabled;
        this.gameConfigs.set(gameType, config);
        console.log(`[AIMatchConfig] Table-level AI matching for ${gameType} ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }
    
    /**
     * 设置快速匹配级别 AI 匹配开关
     * @param {string} gameType - 游戏类型
     * @param {boolean} enabled
     */
    setQuickMatchEnabled(gameType, enabled) {
        const config = this.gameConfigs.get(gameType) || { ...this.defaultConfig };
        config.quickMatchEnabled = enabled;
        this.gameConfigs.set(gameType, config);
        console.log(`[AIMatchConfig] Quick-match AI matching for ${gameType} ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }
    
    /**
     * 更新指定游戏的配置
     * @param {string} gameType - 游戏类型
     * @param {Object} configUpdates - 要更新的配置项
     */
    updateGameConfig(gameType, configUpdates) {
        const currentConfig = this.gameConfigs.get(gameType) || { ...this.defaultConfig };
        const newConfig = { ...currentConfig, ...configUpdates };
        this.gameConfigs.set(gameType, newConfig);
        console.log(`[AIMatchConfig] Updated config for ${gameType}:`, configUpdates);
    }
    
    // ========== 调试方法 ==========
    
    /**
     * 获取当前所有配置状态
     * @returns {Object}
     */
    getStatus() {
        const status = {
            globalEnabled: this.globalEnabled,
            games: {}
        };
        
        for (const [gameType, config] of this.gameConfigs.entries()) {
            status.games[gameType] = {
                ...config,
                effectivelyEnabled: this.isEnabled(gameType)
            };
        }
        
        return status;
    }
    
    /**
     * 打印当前配置状态
     */
    printStatus() {
        console.log('[AIMatchConfig] Current Status:');
        console.log(`  Global Enabled: ${this.globalEnabled}`);
        console.log('  Game Configs:');
        for (const [gameType, config] of this.gameConfigs.entries()) {
            console.log(`    ${gameType}:`);
            console.log(`      enabled: ${config.enabled} (effective: ${this.isEnabled(gameType)})`);
            console.log(`      tableMatchEnabled: ${config.tableMatchEnabled}`);
            console.log(`      quickMatchEnabled: ${config.quickMatchEnabled}`);
            console.log(`      delays: table=${config.tableMatchDelay}ms, quick=${config.quickMatchDelay}ms`);
        }
    }
}

// 单例模式
module.exports = new AIMatchConfig();
