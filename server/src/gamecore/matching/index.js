/**
 * ============================================================================
 * 匹配系统模块索引
 * ============================================================================
 * 
 * 这是游戏匹配系统的主入口文件。
 * 提供统一的模块导出，支持两种命名风格：
 * 1. 新的直观命名（推荐）
 * 2. 旧的命名（向后兼容）
 * 
 * 模块结构：
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                        匹配系统架构                              │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                                                                 │
 * │  ┌─────────────────┐     ┌─────────────────┐                   │
 * │  │ GlobalMatchQueue │     │ RoomMatchQueue  │                   │
 * │  │  (全局匹配队列)  │     │  (房间匹配队列) │                   │
 * │  └────────┬────────┘     └────────┬────────┘                   │
 * │           │                       │                             │
 * │           └───────────┬───────────┘                             │
 * │                       │                                         │
 * │           ┌───────────▼───────────┐                             │
 * │           │   TableMatchManager   │                             │
 * │           │    (牌桌匹配管理器)    │                             │
 * │           └───────────┬───────────┘                             │
 * │                       │                                         │
 * │           ┌───────────▼───────────┐                             │
 * │           │      TableState       │                             │
 * │           │    (牌桌状态管理)      │                             │
 * │           └───────────┬───────────┘                             │
 * │                       │                                         │
 * │     ┌─────────────────┴─────────────────┐                       │
 * │     │                                   │                       │
 * │     ▼                                   ▼                       │
 * │  ┌─────────────────┐     ┌─────────────────┐                   │
 * │  │ TableStatusRules│     │  GameSettings   │                   │
 * │  │  (状态转换规则)  │     │  (游戏配置)     │                   │
 * │  └─────────────────┘     └─────────────────┘                   │
 * │                                                                 │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * 文件结构:
 *   server/src/gamecore/matching/
 *   ├── index.js              # 模块导出入口（本文件）
 *   ├── GlobalMatchQueue.js   # 全局自动匹配队列
 *   ├── RoomMatchQueue.js     # 房间级快速匹配队列（含AI匹配）
 *   ├── TableMatchManager.js  # 牌桌匹配管理器（重构版）
 *   ├── TableState.js         # 牌桌状态管理
 *   ├── TableStatusRules.js   # 状态转换规则
 *   ├── GameSettings.js       # 游戏配置
 *   ├── MatchPlayers.js       # 原始完整类（向后兼容）
 *   ├── StateMappingRules.js  # 原始状态规则（向后兼容）
 *   └── GameConfig.js         # 原始游戏配置（向后兼容）
 * 
 * 使用示例:
 *   // 推荐的新命名方式
 *   const { 
 *       TableMatchManager,    // 牌桌匹配管理器
 *       TableState,           // 牌桌状态管理
 *       TableStatusRules,     // 状态转换规则
 *       GameSettings,         // 游戏配置
 *       GlobalMatchQueue,     // 全局匹配队列
 *       RoomMatchQueue        // 房间匹配队列
 *   } = require('./matching');
 * 
 * 文件位置: server/src/gamecore/matching/index.js
 */

// ============================================================================
// 导入新的模块化文件
// ============================================================================

// 核心匹配管理器（新版，使用独立模块）
const TableMatchManager = require('./TableMatchManager');

// 牌桌状态管理
const TableState = require('./TableState');

// 状态规则（新版）
const TableStatusRules = require('./TableStatusRules');

// 游戏配置（新版）
const GameSettings = require('./GameSettings');

// 队列管理器
const GlobalMatchQueue = require('./GlobalMatchQueue');
const RoomMatchQueue = require('./RoomMatchQueue');

// GameCenter 匹配工具
const CenterMatchHandler = require('./CenterMatchHandler');

// ============================================================================
// 导入原始文件（向后兼容）
// ============================================================================

const MatchPlayers = require('./MatchPlayers');
const StateMappingRules = require('./StateMappingRules');
const GameConfig = require('./GameConfig');

// 从 MatchPlayers 静态属性提取旧类（向后兼容）
const MatchMaker = MatchPlayers.MatchMaker;
const RoomLevelMatchMaker = MatchPlayers.RoomLevelMatchMaker;

// ============================================================================
// 导出模块
// ============================================================================

module.exports = {
    // ========================================
    // 新的直观命名（推荐使用）
    // ========================================
    
    /**
     * 牌桌匹配管理器（新版）
     * 处理玩家匹配、准备状态和倒计时
     */
    TableMatchManager,
    
    /**
     * 牌桌状态管理
     * 管理单个游戏桌的状态
     */
    TableState,
    
    /**
     * 状态转换规则（新版）
     * 定义状态常量和转换规则
     */
    TableStatusRules,
    
    /**
     * 游戏配置（新版）
     * 不同游戏的配置（玩家数、座位策略等）
     */
    GameSettings,
    
    /**
     * 全局匹配队列
     * 跨房间的自动匹配
     */
    GlobalMatchQueue,
    
    /**
     * 房间匹配队列
     * 房间内的快速匹配（含AI匹配）
     */
    RoomMatchQueue,
    
    /**
     * GameCenter 匹配工具
     * 封装 GameCenter 的匹配相关逻辑
     */
    CenterMatchHandler,
    
    // ========================================
    // 旧的命名（向后兼容）
    // ========================================
    
    /**
     * @deprecated 请使用 GlobalMatchQueue
     */
    MatchMaker,
    
    /**
     * @deprecated 请使用 RoomMatchQueue
     */
    RoomLevelMatchMaker,
    
    /**
     * @deprecated 请使用 TableMatchManager
     * 注意：MatchPlayers 仍然是原始的完整类
     */
    MatchPlayers,
    
    /**
     * @deprecated 请使用 TableStatusRules
     */
    StateMappingRules,
    
    /**
     * @deprecated 请使用 GameSettings
     */
    GameConfig,
    
    // ========================================
    // 别名（方便迁移）
    // ========================================
    
    /**
     * MatchRoomState 的别名
     * @deprecated 请使用 TableState
     */
    MatchRoomState: TableState
};

// ============================================================================
// 模块加载日志
// ============================================================================

console.log('[Matching] 匹配系统模块已加载');
console.log('[Matching] 新模块（推荐使用）:');
console.log('  - TableMatchManager (牌桌匹配管理器)');
console.log('  - TableState (牌桌状态管理)');
console.log('  - TableStatusRules (状态转换规则)');
console.log('  - GameSettings (游戏配置)');
console.log('  - GlobalMatchQueue (全局匹配队列)');
console.log('  - RoomMatchQueue (房间匹配队列)');
console.log('  - CenterMatchHandler (GameCenter匹配工具)');
console.log('[Matching] 旧模块（向后兼容）: MatchPlayers, StateMappingRules, GameConfig');
