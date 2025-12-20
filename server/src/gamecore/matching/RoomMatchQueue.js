/**
 * ============================================================================
 * RoomMatchQueue - 房间级快速匹配队列
 * ============================================================================
 * 
 * 在特定房间内管理快速匹配队列。
 * 已入座的玩家发起匹配请求后，优先匹配同房间内其他等待的玩家。
 * 如果超时未匹配到真人，则自动匹配AI对手。
 * 
 * 主要功能：
 * 1. 管理房间级别的匹配队列
 * 2. 支持玩家间快速匹配
 * 3. 超时自动匹配AI
 * 4. 与TableState集成，管理玩家入座
 * 
 * AI匹配流程：
 * 1. 玩家点击"快速匹配"
 * 2. 启动10秒计时器等待真人
 * 3. 如果超时未匹配到真人，调用AI系统匹配AI对手
 * 4. AI入座并开始游戏
 * 
 * 文件位置: server/src/gamecore/matching/RoomMatchQueue.js
 */

const AIMatchConfig = require('../../ai/AIMatchConfig');
const AIPlayerManager = require('../../ai/AIPlayerManager');
const AIGameController = require('../../ai/AIGameController');

class RoomMatchQueue {
    constructor() {
        // 房间匹配队列 Map<roomId, { players: Map<userId, playerInfo>, aiTimers: Map<userId, timerId> }>
        this.roomQueues = new Map();
        // 匹配状态管理器引用 (由MatchPlayers设置)
        this.matchStates = null;
    }

    /**
     * 设置匹配状态管理器
     * @param {Map} matchStates - 匹配状态Map
     */
    setMatchStates(matchStates) {
        this.matchStates = matchStates;
    }

    /**
     * 确保房间队列存在
     * @param {string} roomId - 房间ID
     */
    ensureRoom(roomId) {
        if (!this.roomQueues.has(roomId)) {
            this.roomQueues.set(roomId, {
                players: new Map(),      // 等待匹配的玩家
                aiTimers: new Map()       // AI匹配计时器
            });
        }
    }

    /**
     * 玩家加入房间匹配队列
     * @param {string} roomId - 房间ID
     * @param {Object} player - 玩家信息 { userId, socket, tableId, seatId, stats }
     * @returns {Object} { success, error? }
     */
    joinQueue(roomId, player) {
        this.ensureRoom(roomId);
        const room = this.roomQueues.get(roomId);

        // 检查是否已在队列中
        if (room.players.has(player.userId)) {
            return { success: false, error: '已在匹配队列中' };
        }

        // 记录加入时间
        player.joinTime = Date.now();
        room.players.set(player.userId, player);

        console.log(`[RoomMatchQueue] 玩家 ${player.userId} 加入房间 ${roomId} 匹配队列 (桌号: ${player.tableId})`);

        // 尝试匹配同房间其他玩家
        this.tryMatch(roomId, player);

        // 启动AI匹配计时器
        this.startAIMatchTimer(roomId, player);

        return { success: true };
    }

    /**
     * 玩家离开房间匹配队列
     * @param {string} roomId - 房间ID
     * @param {string} userId - 玩家ID
     * @returns {boolean} 是否成功移除
     */
    leaveQueue(roomId, userId) {
        const room = this.roomQueues.get(roomId);
        if (!room) return false;

        // 清除AI计时器
        this.clearAIMatchTimer(roomId, userId);

        // 从队列中移除
        const removed = room.players.delete(userId);
        if (removed) {
            console.log(`[RoomMatchQueue] 玩家 ${userId} 离开房间 ${roomId} 匹配队列`);
        }
        return removed;
    }

    /**
     * 尝试匹配同房间其他玩家
     * @param {string} roomId - 房间ID
     * @param {Object} player - 发起匹配的玩家
     */
    tryMatch(roomId, player) {
        const room = this.roomQueues.get(roomId);
        if (!room || room.players.size < 2) return;

        // 找到同一桌但不同座位的其他玩家
        for (const [otherId, otherPlayer] of room.players) {
            if (otherId === player.userId) continue;

            // 如果在同一桌，尝试匹配
            if (otherPlayer.tableId === player.tableId) {
                console.log(`[RoomMatchQueue] 房间内匹配成功: ${player.userId} vs ${otherId}`);
                
                // 清除两人的AI计时器
                this.clearAIMatchTimer(roomId, player.userId);
                this.clearAIMatchTimer(roomId, otherId);

                // 从队列中移除两人
                room.players.delete(player.userId);
                room.players.delete(otherId);

                // 通知匹配成功
                this.notifyMatchSuccess(roomId, player.tableId, [player, otherPlayer]);
                return;
            }
        }
    }

    /**
     * 启动AI匹配计时器
     * @param {string} roomId - 房间ID
     * @param {Object} player - 玩家信息
     */
    startAIMatchTimer(roomId, player) {
        const room = this.roomQueues.get(roomId);
        if (!room) return;

        // 清除已有计时器
        this.clearAIMatchTimer(roomId, player.userId);

        // 设置10秒后匹配AI
        const timerId = setTimeout(() => {
            this.onAIMatchTimeout(roomId, player);
        }, 10000);

        room.aiTimers.set(player.userId, timerId);
        console.log(`[RoomMatchQueue] 玩家 ${player.userId} 的AI匹配计时器已启动 (10秒)`);
    }

    /**
     * 清除AI匹配计时器
     * @param {string} roomId - 房间ID
     * @param {string} userId - 玩家ID
     */
    clearAIMatchTimer(roomId, userId) {
        const room = this.roomQueues.get(roomId);
        if (!room) return;

        const timerId = room.aiTimers.get(userId);
        if (timerId) {
            clearTimeout(timerId);
            room.aiTimers.delete(userId);
            console.log(`[RoomMatchQueue] 玩家 ${userId} 的AI匹配计时器已清除`);
        }
    }

    /**
     * AI匹配超时处理
     * @param {string} roomId - 房间ID
     * @param {Object} player - 等待匹配的玩家
     */
    async onAIMatchTimeout(roomId, player) {
        const room = this.roomQueues.get(roomId);
        if (!room) return;

        // 检查玩家是否仍在队列中
        if (!room.players.has(player.userId)) {
            console.log(`[RoomMatchQueue] 玩家 ${player.userId} 已不在队列中，取消AI匹配`);
            return;
        }

        // 获取游戏类型
        const gameType = player.gameType || 'chinesechess';

        // 检查AI匹配是否启用
        if (!AIMatchConfig.isQuickMatchEnabled(gameType)) {
            console.log(`[RoomMatchQueue] ${gameType} 的AI匹配功能已禁用`);
            return;
        }

        console.log(`[RoomMatchQueue] 玩家 ${player.userId} 匹配超时，尝试匹配AI对手`);

        // 从队列中移除玩家
        room.players.delete(player.userId);
        room.aiTimers.delete(player.userId);

        // 获取可用的AI
        const ai = await AIPlayerManager.getAvailableAI(gameType);
        if (!ai) {
            console.log(`[RoomMatchQueue] 没有可用的AI，无法匹配`);
            // 通知玩家匹配失败
            if (player.socket && player.socket.connected) {
                player.socket.emit('matchFailed', { reason: '暂无可用对手' });
            }
            return;
        }

        console.log(`[RoomMatchQueue] 匹配到AI: ${ai.id} (${ai.name})`);

        // 创建AI玩家对象
        const aiPlayer = this.createAIPlayer(ai, player, roomId);

        // 让AI入座并开始游戏
        await this.seatAIPlayer(roomId, player, aiPlayer);
    }

    /**
     * 创建AI玩家对象
     * @param {Object} ai - AI配置
     * @param {Object} humanPlayer - 人类玩家
     * @param {string} roomId - 房间ID
     * @returns {Object} AI玩家对象
     */
    createAIPlayer(ai, humanPlayer, roomId) {
        return {
            odooPlayerId: ai.odooPlayerId,
            odooUserId: ai.odooUserId,
            odooPartnerId: ai.odooPartnerId,
            name: ai.name,
            avatarUrl: ai.avatarUrl || '/images/default-avatar.png',
            isAI: true,
            aiConfig: ai,
            tableId: humanPlayer.tableId,
            roomId: roomId,
            gameType: humanPlayer.gameType || 'chinesechess'
        };
    }

    /**
     * 让AI入座
     * @param {string} roomId - 房间ID
     * @param {Object} humanPlayer - 人类玩家
     * @param {Object} aiPlayer - AI玩家
     */
    async seatAIPlayer(roomId, humanPlayer, aiPlayer) {
        if (!this.matchStates) {
            console.error('[RoomMatchQueue] matchStates 未设置');
            return;
        }

        const tableKey = `${roomId}:${humanPlayer.tableId}`;
        const matchState = this.matchStates.get(tableKey);

        if (!matchState) {
            console.error(`[RoomMatchQueue] 找不到牌桌状态: ${tableKey}`);
            return;
        }

        // 找到空座位
        const emptySeat = matchState.findEmptySeat();
        if (emptySeat === null) {
            console.error(`[RoomMatchQueue] 牌桌 ${tableKey} 没有空座位`);
            return;
        }

        aiPlayer.seatId = emptySeat;

        // 让AI入座
        const result = matchState.addPlayer(aiPlayer, emptySeat);
        if (!result.success) {
            console.error(`[RoomMatchQueue] AI入座失败: ${result.error}`);
            return;
        }

        console.log(`[RoomMatchQueue] AI ${aiPlayer.name} 入座成功 (座位: ${emptySeat})`);

        // 广播AI入座事件
        this.broadcastAIJoined(roomId, humanPlayer.tableId, matchState.players);

        // 设置AI准备状态
        matchState.setPlayerReady(aiPlayer.odooPlayerId, true);

        // 创建AI游戏会话
        await AIGameController.createSession({
            roomId: roomId,
            tableId: humanPlayer.tableId,
            aiPlayer: aiPlayer,
            gameType: aiPlayer.gameType
        });
    }

    /**
     * 广播AI入座事件
     * @param {string} roomId - 房间ID
     * @param {string} tableId - 桌号
     * @param {Object} players - 当前玩家状态
     */
    broadcastAIJoined(roomId, tableId, players) {
        // 这个方法会被MatchPlayers覆盖以使用真实的io实例
        console.log(`[RoomMatchQueue] AI已入座广播 (房间: ${roomId}, 桌号: ${tableId})`);
    }

    /**
     * 通知匹配成功
     * @param {string} roomId - 房间ID
     * @param {string} tableId - 桌号
     * @param {Array} players - 匹配成功的玩家列表
     */
    notifyMatchSuccess(roomId, tableId, players) {
        for (const player of players) {
            if (player.socket && player.socket.connected) {
                player.socket.emit('matchSuccess', {
                    tableId: tableId,
                    players: players.map(p => ({
                        odooPlayerId: p.odooPlayerId,
                        name: p.name,
                        seatId: p.seatId
                    }))
                });
            }
        }
    }

    /**
     * 获取房间队列状态
     * @param {string} roomId - 房间ID
     * @returns {Object} { playerCount, tables }
     */
    getQueueStatus(roomId) {
        const room = this.roomQueues.get(roomId);
        if (!room) {
            return { playerCount: 0, tables: {} };
        }

        const tables = {};
        for (const [userId, player] of room.players) {
            const tableId = player.tableId;
            if (!tables[tableId]) {
                tables[tableId] = [];
            }
            tables[tableId].push(userId);
        }

        return {
            playerCount: room.players.size,
            tables: tables
        };
    }

    /**
     * 清理房间
     * @param {string} roomId - 房间ID
     */
    cleanupRoom(roomId) {
        const room = this.roomQueues.get(roomId);
        if (room) {
            // 清除所有计时器
            for (const timerId of room.aiTimers.values()) {
                clearTimeout(timerId);
            }
            this.roomQueues.delete(roomId);
            console.log(`[RoomMatchQueue] 房间 ${roomId} 的匹配队列已清理`);
        }
    }
}

module.exports = RoomMatchQueue;
