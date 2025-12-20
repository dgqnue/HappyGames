/**
 * ============================================================================
 * CenterMatchHandler - 游戏中心匹配处理器
 * ============================================================================
 * 
 * 为 GameCenter 提供匹配相关的工具方法。
 * 封装房间匹配、快速匹配、AI 匹配等通用逻辑。
 * 
 * 主要功能：
 * 1. 房间级快速匹配处理
 * 2. 全局自动匹配处理
 * 3. AI 匹配集成
 * 4. 匹配结果处理（分配桌子、通知玩家）
 * 
 * 使用方式：
 *   // 在 GameCenter 子类中
 *   const CenterMatchHandler = require('./matching/CenterMatchHandler');
 *   
 *   class MyGameCenter extends GameCenter {
 *       constructor(io, gameType, TableClass) {
 *           super(io, gameType, TableClass);
 *           this.matchHandler = new CenterMatchHandler(this);
 *       }
 *       
 *       async handleRoomQuickMatch(socket, data) {
 *           await this.matchHandler.handleRoomQuickMatch(socket, data);
 *       }
 *   }
 * 
 * 迁移说明：
 *   此类从 ChineseChessCenter.handleRoomMatchFound 中迁移了 AI 玩家处理逻辑，
 *   与 MatchPlayers.onAIMatchTimeout 中的逻辑保持一致，避免代码重复。
 * 
 * 文件位置: server/src/gamecore/matching/CenterMatchHandler.js
 */

// AI 相关模块
const AIPlayerManager = require('../../ai/AIPlayerManager');
const AIGameController = require('../../ai/AIGameController');

class CenterMatchHandler {
    /**
     * 构造函数
     * @param {Object} gameCenter - GameCenter 实例
     */
    constructor(gameCenter) {
        // 游戏中心引用
        this.gameCenter = gameCenter;
        this.io = gameCenter.io;
        this.gameType = gameCenter.gameType;
        this.gameRooms = gameCenter.gameRooms;
        
        // 匹配器引用
        this.matchMaker = gameCenter.matchMaker;
        this.roomLevelMatchMaker = gameCenter.roomLevelMatchMaker;
    }

    // ========================================================================
    // 房间级快速匹配
    // ========================================================================

    /**
     * 处理房间级快速匹配请求
     * 玩家在指定房间内请求快速匹配
     * 
     * @param {Object} socket - Socket 实例
     * @param {Object} data - 请求数据 { roomId }
     */
    async handleRoomQuickMatch(socket, data) {
        const { roomId } = data;
        console.log(`[CenterMatchHandler] 房间快速匹配: roomId=${roomId}, gameType=${this.gameType}`);
        
        // 检查匹配服务是否启用
        if (!this.roomLevelMatchMaker) {
            console.log(`[CenterMatchHandler] 匹配服务未启用`);
            socket.emit('match_failed', { message: '匹配服务未启用' });
            return;
        }

        // 检查房间ID
        if (!roomId) {
            console.log(`[CenterMatchHandler] 未指定房间`);
            socket.emit('match_failed', { message: '未指定房间' });
            return;
        }

        // 检查房间是否存在
        const gameRoom = this.gameRooms.get(roomId);
        if (!gameRoom) {
            console.log(`[CenterMatchHandler] 房间不存在: ${roomId}`);
            socket.emit('match_failed', { message: '游戏房间不存在' });
            return;
        }

        // 获取玩家统计数据
        const stats = await this.gameCenter.getUserStats(socket.user._id);
        console.log(`[CenterMatchHandler] 玩家统计: rating=${stats.rating}`);
        
        // 检查玩家是否满足房间要求
        if (!gameRoom.canAccess(stats.rating)) {
            socket.emit('match_failed', { 
                message: `您的等级分 ${stats.rating} 不符合 ${gameRoom.name} 的要求` 
            });
            return;
        }

        // 加入房间匹配队列
        const result = this.roomLevelMatchMaker.joinRoomQueue(this.gameType, roomId, {
            userId: socket.user._id.toString(),
            socket,
            stats,
            gameType: this.gameType
        });
        console.log(`[CenterMatchHandler] joinRoomQueue 结果:`, result);

        if (result.success) {
            socket.emit('room_match_queue_joined', { 
                message: `已加入 ${gameRoom.name} 匹配队列`,
                roomId: roomId
            });
        } else {
            socket.emit('match_failed', { message: result.error });
        }
    }

    /**
     * 处理取消房间级匹配
     * @param {Object} socket - Socket 实例
     */
    handleCancelRoomQuickMatch(socket) {
        if (!this.roomLevelMatchMaker) return;
        
        this.roomLevelMatchMaker.removeFromAllQueues(this.gameType, socket.user._id.toString());
        socket.emit('room_match_cancelled', { message: '已取消匹配' });
        console.log(`[CenterMatchHandler] 玩家 ${socket.user._id} 取消匹配`);
    }

    /**
     * 处理房间级匹配成功
     * @param {Array} players - 匹配成功的玩家列表
     * @param {string} roomId - 房间ID
     */
    async handleRoomMatchFound(players, roomId) {
        console.log(`[CenterMatchHandler] 房间匹配成功 (${roomId}): ${players.map(p => p.userId).join(' vs ')}`);

        const gameRoom = this.gameRooms.get(roomId);
        if (!gameRoom) {
            console.error(`[CenterMatchHandler] 找不到房间: ${roomId}`);
            this.notifyMatchFailed(players, '游戏房间不存在');
            return;
        }

        // 找一个空桌子或创建新桌子
        let table = gameRoom.findAvailableTable();
        if (!table) {
            table = gameRoom.addTable();
        }

        console.log(`[CenterMatchHandler] 分配桌子: ${table.tableId}`);

        // 区分人类玩家和 AI 玩家
        const humanPlayers = players.filter(p => !p.isAI);
        const aiPlayers = players.filter(p => p.isAI);

        // 先让人类玩家加入
        for (const p of humanPlayers) {
            await this.joinPlayerToTable(p, table, roomId, aiPlayers.length > 0);
        }

        // 然后让 AI 玩家加入（如果有）
        for (const aiPlayer of aiPlayers) {
            await this.joinAIToTable(aiPlayer, table, roomId);
        }

        // 广播房间列表更新
        this.gameCenter.broadcastRoomList(roomId);
    }

    /**
     * 让人类玩家加入桌子
     * @param {Object} player - 玩家信息
     * @param {Object} table - 游戏桌实例
     * @param {string} roomId - 房间ID
     * @param {boolean} isAIMatch - 是否是 AI 匹配
     */
    async joinPlayerToTable(player, table, roomId, isAIMatch) {
        const { socket, userId } = player;
        
        // 加入房间级广播室
        const broadcastRoom = `${this.gameType}_${roomId}`;
        socket.join(broadcastRoom);
        console.log(`[CenterMatchHandler] 玩家 ${userId} 加入广播室: ${broadcastRoom}`);
        
        // 通知前端匹配成功
        socket.emit('match_found', {
            roomId: table.tableId,
            tableId: table.tableId,
            roomType: roomId,
            message: '匹配成功！正在进入游戏...',
            isAIMatch: isAIMatch
        });

        // 执行加入逻辑
        await table.joinTable(socket, true);

        // 记录当前房间信息
        socket.currentRoomId = table.tableId;
        socket.currentGameId = this.gameType;

        console.log(`[CenterMatchHandler] 玩家 ${userId} 已加入桌子 ${table.tableId}`);
    }

    /**
     * 让 AI 加入桌子
     * 此方法从 ChineseChessCenter.handleRoomMatchFound 迁移而来
     * 与 MatchPlayers.onAIMatchTimeout 中的逻辑保持一致
     * 
     * @param {Object} aiPlayerInfo - AI 玩家信息
     * @param {Object} table - 游戏桌实例
     * @param {string} roomId - 房间ID
     */
    async joinAIToTable(aiPlayerInfo, table, roomId) {
        const aiPlayer = aiPlayerInfo.aiPlayer || aiPlayerInfo;
        console.log(`[CenterMatchHandler] AI 玩家 ${aiPlayer.nickname} 加入桌子 ${table.tableId}`);
        
        // 标记 AI 为忙碌状态
        AIPlayerManager.markAsBusy(aiPlayer.odid, table.tableId);
        
        // 构造 AI 玩家数据（与真实玩家格式一致）
        const aiPlayerData = {
            odid: aiPlayer.odid,
            userId: aiPlayer.odid,
            socketId: `ai_socket_${aiPlayer.odid}`,
            user: {
                _id: aiPlayer.id,
                odid: aiPlayer.odid,
                userId: aiPlayer.odid,
                nickname: aiPlayer.nickname,
                avatar: aiPlayer.avatar
            },
            nickname: aiPlayer.nickname,
            avatar: aiPlayer.avatar,
            title: aiPlayer.title,
            titleColor: aiPlayer.titleColor,
            rating: aiPlayer.rating,
            winRate: 50,
            disconnectRate: 0,
            matchSettings: null,
            ready: false,
            isAI: true
        };
        
        // 通过 matchState 添加玩家
        const result = table.matchPlayers.matchState.addPlayer(aiPlayerData);
        if (!result.success) {
            console.error(`[CenterMatchHandler] AI 入座失败:`, result.error);
            return;
        }
        
        // 广播房间状态，让前端看到 AI 入座
        await table.broadcastRoomState();
        
        // 确定 AI 的颜色（第二个加入的是黑方）
        const aiSide = table.matchPlayers.matchState.players.length === 2 ? 'b' : 'r';
        
        console.log(`[CenterMatchHandler] 创建 AI 会话: tableId=${table.tableId}, AI=${aiPlayer.odid}, 颜色=${aiSide}`);
        
        // 创建 AI 游戏会话（关键！这样 AI 才会走棋）
        AIGameController.createSession(table, aiPlayer, aiSide);
        
        // 1-2秒后 AI 自动准备
        const readyDelay = Math.floor(Math.random() * 1000) + 1000;
        setTimeout(async () => {
            await table.matchPlayers.handleAIReady(aiPlayer.odid);
        }, readyDelay);
    }

    // ========================================================================
    // 全局自动匹配
    // ========================================================================

    /**
     * 处理全局自动匹配请求
     * 玩家请求跨房间的自动匹配
     * 
     * @param {Object} socket - Socket 实例
     * @param {Object} settings - 匹配设置
     */
    async handleAutoMatch(socket, settings) {
        console.log(`[CenterMatchHandler] 全局自动匹配: userId=${socket.user._id}`);
        
        if (!this.matchMaker) {
            console.log(`[CenterMatchHandler] 全局匹配服务未启用`);
            socket.emit('match_failed', { message: '匹配服务未启用' });
            return;
        }

        // 获取玩家统计数据
        const stats = await this.gameCenter.getUserStats(socket.user._id);

        // 加入全局匹配队列
        const result = this.matchMaker.joinQueue(this.gameType, {
            userId: socket.user._id.toString(),
            socket,
            stats,
            settings: settings || {}
        });

        if (result.success) {
            socket.emit('match_queue_joined', { 
                message: '已加入匹配队列',
                queueStatus: this.matchMaker.getQueueStatus(this.gameType)
            });
        } else {
            socket.emit('match_failed', { message: result.error });
        }
    }

    /**
     * 处理取消全局匹配
     * @param {Object} socket - Socket 实例
     */
    handleCancelAutoMatch(socket) {
        if (!this.matchMaker) return;
        
        this.matchMaker.leaveQueue(this.gameType, socket.user._id.toString());
        socket.emit('match_cancelled', { message: '已取消匹配' });
        console.log(`[CenterMatchHandler] 玩家 ${socket.user._id} 取消全局匹配`);
    }

    /**
     * 处理全局匹配成功
     * @param {Array} players - 匹配成功的玩家列表
     */
    async handleMatchFound(players) {
        console.log(`[CenterMatchHandler] 全局匹配成功: ${players.map(p => p.userId).join(' vs ')}`);

        // 根据玩家等级分选择合适的房间
        const avgRating = players.reduce((sum, p) => sum + (p.stats?.rating || 1200), 0) / players.length;
        const roomId = this.selectRoomByRating(avgRating);
        
        if (!roomId) {
            console.error(`[CenterMatchHandler] 找不到合适的房间`);
            this.notifyMatchFailed(players, '找不到合适的房间');
            return;
        }

        // 使用房间匹配成功的处理逻辑
        await this.handleRoomMatchFound(players, roomId);
    }

    /**
     * 根据等级分选择房间
     * @param {number} rating - 平均等级分
     * @returns {string|null} 房间ID
     */
    selectRoomByRating(rating) {
        // 遍历所有房间，找到合适的
        for (const [roomId, gameRoom] of this.gameRooms) {
            if (gameRoom.canAccess(rating)) {
                return roomId;
            }
        }
        
        // 如果都不合适，返回第一个房间
        const firstRoom = this.gameRooms.keys().next().value;
        return firstRoom || null;
    }

    // ========================================================================
    // 辅助方法
    // ========================================================================

    /**
     * 通知玩家匹配失败
     * @param {Array} players - 玩家列表
     * @param {string} message - 失败原因
     */
    notifyMatchFailed(players, message) {
        for (const p of players) {
            if (p.socket && p.socket.connected) {
                p.socket.emit('match_failed', { message });
            }
        }
    }

    /**
     * 清理玩家的匹配状态
     * @param {Object} socket - Socket 实例
     */
    cleanupPlayerMatch(socket) {
        const userId = socket.user._id.toString();
        
        // 从全局队列移除
        if (this.matchMaker) {
            this.matchMaker.leaveQueue(this.gameType, userId);
        }
        
        // 从房间队列移除
        if (this.roomLevelMatchMaker) {
            this.roomLevelMatchMaker.removeFromAllQueues(this.gameType, userId);
        }
        
        console.log(`[CenterMatchHandler] 清理玩家 ${userId} 的匹配状态`);
    }

    /**
     * 获取匹配状态摘要
     * @returns {Object} 匹配状态
     */
    getMatchStatus() {
        return {
            globalQueue: this.matchMaker ? this.matchMaker.getQueueStatus(this.gameType) : null,
            roomQueues: this.roomLevelMatchMaker ? this.getRoomQueueStatus() : null
        };
    }

    /**
     * 获取所有房间队列状态
     * @returns {Object} 房间队列状态
     */
    getRoomQueueStatus() {
        const status = {};
        for (const roomId of this.gameRooms.keys()) {
            status[roomId] = this.roomLevelMatchMaker.getQueueStatus(roomId);
        }
        return status;
    }

    // ========================================================================
    // 事件注册
    // ========================================================================

    /**
     * 为 socket 注册匹配相关事件
     * @param {Object} socket - Socket 实例
     */
    registerMatchEvents(socket) {
        // 房间快速匹配
        const quickMatchEvent = `${this.gameType}_room_quick_match`;
        socket.on(quickMatchEvent, async (data) => {
            await this.handleRoomQuickMatch(socket, data);
        });
        
        // 取消房间匹配
        const cancelRoomMatchEvent = `${this.gameType}_cancel_room_quick_match`;
        socket.on(cancelRoomMatchEvent, () => {
            this.handleCancelRoomQuickMatch(socket);
        });
        
        // 全局自动匹配
        socket.on('auto_match', async (settings) => {
            await this.handleAutoMatch(socket, settings);
        });
        
        // 取消全局匹配
        socket.on('cancel_match', () => {
            this.handleCancelAutoMatch(socket);
        });
        
        console.log(`[CenterMatchHandler] 已为 socket ${socket.id} 注册匹配事件`);
    }

    /**
     * 清理 socket 的匹配事件
     * @param {Object} socket - Socket 实例
     */
    cleanupMatchEvents(socket) {
        const quickMatchEvent = `${this.gameType}_room_quick_match`;
        const cancelRoomMatchEvent = `${this.gameType}_cancel_room_quick_match`;
        
        socket.off(quickMatchEvent);
        socket.off(cancelRoomMatchEvent);
        socket.off('auto_match');
        socket.off('cancel_match');
        
        // 清理匹配状态
        this.cleanupPlayerMatch(socket);
    }
}

module.exports = CenterMatchHandler;
