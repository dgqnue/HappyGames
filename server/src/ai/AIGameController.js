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
        
        console.log(`[AIGameController] Session created for table ${table.tableId}, AI: ${aiPlayer.nickname} (${aiSide})`);
        
        return session;
    }
    
    /**
     * AI 入座游戏桌
     * @param {Object} table - 游戏桌实例
     * @param {Object} aiPlayer - AI 玩家信息
     */
    async joinTable(table, aiPlayer) {
        console.log(`[AIGameController] AI ${aiPlayer.nickname} joining table ${table.tableId}`);
        
        // 模拟 AI 玩家数据结构（与真人玩家一致）
        const aiPlayerData = {
            odid: aiPlayer.odid,
            odid: aiPlayer.odid,
            odid: aiPlayer.odid,
            nickname: aiPlayer.nickname,
            avatar: aiPlayer.avatar,
            title: aiPlayer.title,
            titleColor: aiPlayer.titleColor,
            ready: false,
            isAI: true, // 内部标记，不发送给客户端
            // 模拟 socket 对象（AI 没有真实 socket）
            socketId: `ai_socket_${aiPlayer.odid}`,
            user: {
                _id: aiPlayer.id,
                odid: aiPlayer.odid,
                nickname: aiPlayer.nickname,
                avatar: aiPlayer.avatar
            }
        };
        
        // 添加到游戏桌
        table.players.push(aiPlayerData);
        
        // 广播玩家加入
        table.broadcastRoomState();
        
        // 1-2秒后自动准备（模拟真人操作延迟）
        const readyDelay = Math.floor(Math.random() * 1000) + 1000;
        setTimeout(() => {
            this.setReady(table, aiPlayer.odid);
        }, readyDelay);
    }
    
    /**
     * AI 准备
     */
    setReady(table, aiUserId) {
        const player = table.players.find(p => p.odid === aiUserId);
        if (player) {
            player.ready = true;
            console.log(`[AIGameController] AI ${player.nickname} is ready on table ${table.tableId}`);
            
            // 通知 MatchPlayers 检查是否可以开始
            if (table.matchPlayers) {
                table.matchPlayers.handlePlayerReady(aiUserId);
            }
            
            // 广播状态更新
            table.broadcastRoomState();
        }
    }
    
    /**
     * 通知 AI 轮到它走棋
     * @param {string} tableId - 游戏桌 ID
     * @param {Array} board - 当前棋盘
     * @param {string} turn - 当前回合 ('r' 或 'b')
     */
    async onTurnChanged(tableId, board, turn) {
        const session = this.activeSessions.get(tableId);
        if (!session || !session.isActive) return;
        
        // 检查是否轮到 AI
        if (turn !== session.aiSide) return;
        
        console.log(`[AIGameController] AI's turn on table ${tableId}`);
        
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
        
        console.log(`[AIGameController] Game ended on table ${tableId}, result:`, result);
        
        session.isActive = false;
        
        // 释放 AI 玩家
        AIPlayerManager.releaseAI(session.aiPlayer.odid);
        
        // 移除会话
        this.activeSessions.delete(tableId);
    }
    
    /**
     * 玩家离开处理（真人离开时，AI 也应该离开）
     */
    onPlayerLeave(tableId, userId) {
        const session = this.activeSessions.get(tableId);
        if (!session) return;
        
        // 如果真人离开，AI 也离开
        if (userId !== session.aiPlayer.odid) {
            console.log(`[AIGameController] Human player left, AI leaving table ${tableId}`);
            this.onGameEnd(tableId, { reason: 'opponent_left' });
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
