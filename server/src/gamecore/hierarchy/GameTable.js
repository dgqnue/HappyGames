/**
 * 游戏桌基类 (GameTable)
 * 定义了游戏桌的基本行为：玩家加入、离开、游戏开始、结束、消息广播等。
 * 游戏桌是玩家实际进行游戏的场所。
 * 
 * 注意：具体的结算逻辑 (settle) 和签名逻辑 (sign) 已移至具体的游戏桌子类中实现。
 */
class GameTable {
    constructor(io, roomId) {
        this.io = io;
        this.roomId = roomId; // 游戏桌ID
        // Note: players 属性由子类管理（MatchableGameTable 使用 getter）
    }

    get tableId() {
        return this.roomId;
    }

    onJoin(player) { }
    onLeave(player) { }
    onGameStart() { }
    onGameEnd() { }

    /**
     * 处理玩家加入游戏桌
     * 子类必须重写此方法
     */
    joinTable(socket, canPlay) {
        throw new Error('joinTable() must be implemented by subclass');
    }

    /**
     * 处理玩家离开游戏桌
     * 基类提供通用逻辑，子类可以通过 onPlayerLeaveDuringGame 钩子实现游戏特定的处理
     */
    playerLeave(socket) {
        // 调用游戏特定的离开处理（如游戏中离开的判负逻辑）
        if (this.status === 'playing') {
            this.onPlayerLeaveDuringGame(socket);
        }

        // 移除游戏特定事件监听
        this.removePlayerEventListeners(socket);
        
        const gameType = this.gameType || 'game';
        console.log(`[${gameType}Table] playerLeave: calling matchPlayers.playerLeave for ${socket.user._id}`);
        const result = this.matchPlayers.playerLeave(socket);
        const playerCountAfter = this.matchPlayers.matchState.players.length;
        console.log(`[${gameType}Table] playerLeave: returned result=${result}, table status now=${this.matchPlayers.matchState.status}, players count=${playerCountAfter}`);
        
        // 关键修复：如果所有玩家都离开了，需要立即重置游戏桌状态为 IDLE
        // 这很重要，因为在游戏中离开时会先调用 onPlayerLeaveDuringGame（可能触发 handleWin），
        // 将状态设为 MATCHING，然后才移除玩家，所以需要在移除后检查是否还有玩家
        if (playerCountAfter === 0) {
            console.log(`[${gameType}Table] All players left table ${this.tableId}, resetting game state to IDLE`);
            // 重置游戏状态
            this.matchPlayers.matchState.status = 'idle';
            // 重置游戏数据（由子类实现，如 resetBoard）
            this.resetGameData();
            // 清除所有定时器（再来一局倒计时等）
            if (this.matchPlayers.matchState.rematchTimer) {
                clearTimeout(this.matchPlayers.matchState.rematchTimer);
                this.matchPlayers.matchState.rematchTimer = null;
                console.log(`[${gameType}Table] Cleared rematch timer in playerLeave cleanup`);
            }
            if (this.matchPlayers.countdownTimer) {
                clearTimeout(this.matchPlayers.countdownTimer);
                this.matchPlayers.countdownTimer = null;
                console.log(`[${gameType}Table] Cleared countdown timer in playerLeave cleanup`);
            }
            // 广播最终的房间状态
            this.broadcastRoomState();
        } else {
            // 当有玩家离开时，立即广播房间状态以确保状态立即更新（无论是胜利还是点击退出）
            console.log(`[${gameType}Table] Player left, broadcasting room state immediately. Remaining players: ${playerCountAfter}, status: ${this.matchPlayers.matchState.status}`);
            this.broadcastRoomState();
        }
        
        return result;
    }

    /**
     * 玩家在游戏中离开时的处理钩子
     * 子类可重写此方法实现游戏特定逻辑（如判负）
     */
    onPlayerLeaveDuringGame(socket) {
        // 默认不做处理，子类可重写
    }

    /**
     * 移除玩家特定的事件监听器
     * 子类应重写此方法移除游戏特定的事件监听
     */
    removePlayerEventListeners(socket) {
        // 默认不做处理，子类可重写
        // 示例：socket.removeAllListeners(`${this.gameType}_move`);
    }

    /**
     * 重置游戏数据
     * 子类应重写此方法重置游戏特定的数据（如棋盘）
     */
    resetGameData() {
        // 默认不做处理，子类可重写
        // 示例：this.resetBoard();
    }

    /**
     * 广播房间状态
     * 子类应重写此方法或确保有 broadcastRoomState 的实现
     */
    broadcastRoomState() {
        // 默认不做处理，子类应重写此方法
        throw new Error('broadcastRoomState() must be implemented by subclass');
    }

    // 发送消息到游戏桌内的所有玩家
    broadcast(event, data) {
        this.io.to(this.roomId).emit(event, data);
    }

    // 发送消息给特定玩家
    sendToPlayer(socketId, event, data) {
        this.io.to(socketId).emit(event, data);
    }
}

module.exports = GameTable;
