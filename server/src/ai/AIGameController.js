/**
 * AI 游戏控制器
 * 
 * 负责控制 AI 在游戏中的行为：
 * 1. 模拟 AI 入座
 * 2. 自动准备
 * 3. 计算并执行走棋
 * 4. 处理游戏结束
 * 
 * 文件位置: server/src/ai/AIGameController.js
 */

const AIPlayerManager = require('./AIPlayerManager');
const ChessAIEngine = require('./ChessAIEngine');
const UserGameStats = require('../models/UserGameStats');
const AIMatchConfig = require('./AIMatchConfig');

class AIGameController {
    constructor() {
        // 活跃的 AI 游戏会话 (tableId -> AIGameSession)
        this.activeSessions = new Map();
    }
    
    /**
     * 创建 AI 游戏会话
     * @param {Object} table - 游戏桌实例
     * @param {Object} aiPlayer - AI 玩家信息
     * @param {string} aiSide - AI 执的颜色 ('r' 或 'b')
     */
    createSession(table, aiPlayer, aiSide) {
        console.log(`[AIGameController] createSession called: tableId=${table.tableId}, aiPlayer=${aiPlayer.nickname}, aiSide=${aiSide}, aiPlayer.odid=${aiPlayer.odid}`);
        
        const session = {
            tableId: table.tableId,
            table: table,
            aiPlayer: aiPlayer,
            aiSide: aiSide,
            isActive: true,
            moveCount: 0
        };
        
        this.activeSessions.set(table.tableId, session);
        AIPlayerManager.markAsBusy(aiPlayer.odid, table.tableId);
        
        console.log(`[AIGameController] Session created for table ${table.tableId}, AI: ${aiPlayer.nickname} (${aiSide}), total sessions: ${this.activeSessions.size}`);
        
        return session;
    }
    
    /**
     * AI 入座游戏桌
     * @param {Object} table - 游戏桌实例
     * @param {Object} aiPlayer - AI 玩家信息
     */
    async joinTable(table, aiPlayer) {
        console.log(`[AIGameController] AI ${aiPlayer.nickname} joining table ${table.tableId}`);
        
        // 使用 User._id.toString() 作为 odid，与真实玩家保持一致
        // 兼容 mongoose document 和 plain object
        const rawId = aiPlayer.id || aiPlayer._id;
        const odid = rawId ? rawId.toString() : null;
        
        if (!odid) {
            console.error(`[AIGameController] Failed to get AI ID for ${aiPlayer.nickname}`);
            return;
        }
        
        // 模拟 AI 玩家数据结构（与真人玩家一致）
        const aiPlayerData = {
            odid: odid,
            userId: odid,
            nickname: aiPlayer.nickname,
            avatar: aiPlayer.avatar,
            title: aiPlayer.title,
            titleColor: aiPlayer.titleColor,
            rating: aiPlayer.rating,
            ready: false,
            isAI: true,
            socketId: `ai_socket_${odid}`,
            user: {
                _id: rawId,
                odid: odid,
                userId: odid,
                nickname: aiPlayer.nickname,
                avatar: aiPlayer.avatar
            }
        };
        
        // 保存 odid 以便后续使用
        aiPlayer.odid = odid;
        
        // 添加到游戏桌
        table.players.push(aiPlayerData);
        
        // 广播玩家加入
        await table.broadcastRoomState();
        
        // 1-2秒后自动准备（模拟真人操作延迟）
        const readyDelay = Math.floor(Math.random() * 1000) + 1000;
        setTimeout(async () => {
            await this.setReady(table, odid);
        }, readyDelay);
    }
    
    /**
     * AI 准备
     */
    async setReady(table, aiUserId) {
        const player = table.players.find(p => p.odid === aiUserId);
        if (player) {
            player.ready = true;
            console.log(`[AIGameController] AI ${player.nickname} is ready on table ${table.tableId}`);
            
            // 通知 MatchPlayers 检查是否可以开始 - handleAIReady 现在是 async
            if (table.matchPlayers && typeof table.matchPlayers.handleAIReady === 'function') {
                await table.matchPlayers.handleAIReady(aiUserId);
            } else {
                // 备用方案：直接设置准备状态并广播
                console.warn(`[AIGameController] handleAIReady not available, using fallback`);
                if (table.matchPlayers && table.matchPlayers.matchState) {
                    const result = table.matchPlayers.matchState.setPlayerReady(aiUserId, true);
                    await table.broadcastRoomState();
                    
                    if (result === 'all_ready') {
                        console.log(`[AIGameController] All players ready, triggering game start`);
                        table.matchPlayers.startRoundCountdown();
                    }
                }
            }
        }
    }
    
    /**
     * 更新 AI 的执子颜色 (用于换边)
     */
    updateSide(tableId, newSide) {
        const session = this.activeSessions.get(tableId);
        if (session) {
            console.log(`[AIGameController] Updating AI side on table ${tableId}: ${session.aiSide} -> ${newSide}`);
            session.aiSide = newSide;
            // 确保会话是活跃的
            session.isActive = true;
        }
    }

    /**
     * 通知 AI 轮到它走棋
     * @param {string} tableId - 游戏桌 ID
     * @param {Array} board - 当前棋盘
     * @param {string} turn - 当前回合 ('r' 或 'b')
     */
    async onTurnChanged(tableId, board, turn) {
        console.log(`[AIGameController] onTurnChanged called: tableId=${tableId}, turn=${turn}`);
        
        const session = this.activeSessions.get(tableId);
        if (!session) {
            console.log(`[AIGameController] No session found for table ${tableId}`);
            return;
        }
        if (!session.isActive) {
            console.log(`[AIGameController] Session exists but not active for table ${tableId}`);
            return;
        }
        
        console.log(`[AIGameController] Session found: aiSide=${session.aiSide}, isActive=${session.isActive}, aiPlayer=${session.aiPlayer?.nickname}`);
        
        // 检查是否轮到 AI
        if (turn !== session.aiSide) {
            console.log(`[AIGameController] Not AI's turn (turn=${turn}, aiSide=${session.aiSide})`);
            return;
        }
        
        console.log(`[AIGameController] AI's turn on table ${tableId}, calculating move...`);
        
        try {
            // 计算最佳走法
            const result = await AIPlayerManager.calculateMove(
                board, 
                session.aiSide, 
                session.aiPlayer.odid
            );
            
            if (!result || !result.move) {
                console.error(`[AIGameController] AI failed to calculate move on table ${tableId}`);
                return;
            }
            
            // 等待思考时间后执行走棋
            setTimeout(() => {
                this.executeMove(session, result.move);
            }, result.thinkTime);
            
        } catch (err) {
            console.error(`[AIGameController] Error calculating AI move:`, err);
        }
    }
    
    /**
     * 执行 AI 走棋
     */
    executeMove(session, move) {
        if (!session.isActive) return;
        
        const { table, aiPlayer } = session;
        
        console.log(`[AIGameController] AI ${aiPlayer.nickname} executing move: (${move.from.x},${move.from.y}) -> (${move.to.x},${move.to.y})`);
        
        // 构造移动数据
        const moveData = {
            fromX: move.from.x,
            fromY: move.from.y,
            toX: move.to.x,
            toY: move.to.y
        };
        
        // 调用游戏桌的移动处理（模拟收到 socket 消息）
        // 需要传入一个模拟的 socket 对象
        const mockSocket = {
            user: {
                _id: { toString: () => aiPlayer.odid },
                odid: aiPlayer.odid
            }
        };
        
        try {
            table.handleMove(mockSocket, moveData);
            session.moveCount++;
        } catch (err) {
            console.error(`[AIGameController] Error executing AI move:`, err);
        }
    }
    
    /**
     * 游戏结束处理
     */
    onGameEnd(tableId, result) {
        const session = this.activeSessions.get(tableId);
        if (!session) return;
        
        const gameType = session.table?.gameType || 'chinesechess';
        console.log(`[AIGameController] Game ended on table ${tableId}, result:`, result);
        
        // 检查配置：人类离开时 AI 是否应该离开
        if (result && (result.reason === 'opponent_left' || result.reason === 'player_left')) {
            if (AIMatchConfig.shouldAILeaveOnHumanLeave(gameType)) {
                this.leaveTable(session);
                return;
            }
        }

        // 随机延迟后决定是否再来一局 (2-5秒)
        const delay = 2000 + Math.random() * 3000;
        
        setTimeout(() => {
            // 检查会话是否还存在（可能在等待期间被清理了）
            if (!this.activeSessions.has(tableId)) return;

            // 从配置获取再来一局概率
            const rematchProbability = AIMatchConfig.getRematchProbability(gameType);
            if (Math.random() < rematchProbability) {
                this.rematch(session);
            } else {
                this.leaveTable(session);
            }
        }, delay);
    }

    /**
     * AI 请求再来一局
     */
    rematch(session) {
        console.log(`[AIGameController] AI ${session.aiPlayer.nickname} deciding to rematch on table ${session.tableId}`);
        
        const mockSocket = {
            user: {
                _id: { toString: () => session.aiPlayer.odid },
                odid: session.aiPlayer.odid,
                username: session.aiPlayer.nickname
            },
            emit: () => {}
        };
        
        // 调用 MatchPlayers 的 playerReady
        if (session.table && session.table.matchPlayers) {
            // 注意：这里调用的是 playerReady，MatchPlayers 会处理 rematch 逻辑
            session.table.matchPlayers.playerReady(mockSocket);
        }
    }

    /**
     * AI 离开游戏桌
     */
    leaveTable(session) {
        // 防止重复调用
        if (!session || session.isLeaving) {
            console.log(`[AIGameController] leaveTable called but session is null or already leaving`);
            return;
        }
        
        session.isLeaving = true;
        console.log(`[AIGameController] AI ${session.aiPlayer.nickname} leaving table ${session.tableId}`);
        
        // 先从 activeSessions 中删除，防止循环调用
        session.isActive = false;
        this.activeSessions.delete(session.tableId);
        
        // 释放 AI 资源
        AIPlayerManager.releaseAI(session.aiPlayer.odid);
        
        // 最后通知 MatchPlayers 移除 AI 玩家
        if (session.table && session.table.matchPlayers) {
            const aiId = session.aiPlayer.odid;
            console.log(`[AIGameController] Constructing mock socket for AI removal: ${aiId}`);
            
            const mockSocket = {
                id: `ai_socket_${aiId}`,
                user: {
                    _id: aiId, // MatchPlayers uses .toString() on this
                    odid: aiId,
                    userId: aiId,
                    username: session.aiPlayer.nickname
                },
                emit: () => {},
                leave: () => {},
                rooms: new Set()
            };
            
            // 使用 try-catch 防止错误传播
            try {
                session.table.matchPlayers.playerLeave(mockSocket);
                console.log(`[AIGameController] AI successfully removed from table ${session.tableId}`);
            } catch (err) {
                console.error(`[AIGameController] Error removing AI from table:`, err);
            }
        }
    }
    
    /**
     * 玩家离开处理（真人离开时，AI 也应该离开）
     */
    onPlayerLeave(tableId, userId) {
        console.log(`[AIGameController] onPlayerLeave called for table ${tableId}, user ${userId}`);
        console.log(`[AIGameController] Active sessions:`, Array.from(this.activeSessions.keys()));
        
        const session = this.activeSessions.get(tableId);
        
        if (!session) {
            console.log(`[AIGameController] No active session found for table ${tableId}`);
            return;
        }
        
        console.log(`[AIGameController] Session found: AI=${session.aiPlayer.nickname}, aiOdid=${session.aiPlayer.odid}, leavingUserId=${userId}`);
        console.log(`[AIGameController] Comparison: userId(${typeof userId})=${userId} vs aiOdid(${typeof session.aiPlayer.odid})=${session.aiPlayer.odid}`);
        
        // 防止重复处理
        if (session.isLeaving) {
            console.log(`[AIGameController] Session already leaving, ignoring`);
            return;
        }
        
        if (session.pendingLeave) {
            console.log(`[AIGameController] Session already has pending leave, ignoring`);
            return;
        }
        
        // 如果真人离开，AI 立即离开（不再延迟，因为延迟会导致问题）
        if (userId !== session.aiPlayer.odid) {
            console.log(`[AIGameController] Human player left (${userId} !== ${session.aiPlayer.odid}), AI leaving immediately`);
            
            // 标记为即将离开，防止重复触发
            session.pendingLeave = true;
            
            // 立即离开，不再延迟
            this.leaveTable(session);
        } else {
            console.log(`[AIGameController] AI itself left (or was removed), cleaning up session`);
            // AI 自己被移除时，也需要清理会话
            session.isActive = false;
            this.activeSessions.delete(tableId);
            AIPlayerManager.releaseAI(session.aiPlayer.odid);
        }
    }
    
    /**
     * 获取会话信息
     */
    getSession(tableId) {
        return this.activeSessions.get(tableId);
    }
    
    /**
     * 检查是否有活跃的 AI 会话
     */
    hasActiveSession(tableId) {
        const session = this.activeSessions.get(tableId);
        return session && session.isActive;
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        return {
            activeSessions: this.activeSessions.size,
            sessions: Array.from(this.activeSessions.entries()).map(([id, s]) => ({
                tableId: id,
                aiPlayer: s.aiPlayer.nickname,
                aiSide: s.aiSide,
                moveCount: s.moveCount,
                isActive: s.isActive
            }))
        };
    }
}

// 单例模式
module.exports = new AIGameController();
