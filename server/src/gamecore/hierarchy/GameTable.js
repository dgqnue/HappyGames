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
