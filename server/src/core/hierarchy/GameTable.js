// 文件：server/src/gamecore/BaseGameTable.js
const axios = require('axios');
const crypto = require('crypto');
const SECRET_KEY = process.env.SETTLEMENT_SECRET_KEY || 'YOUR_SECURE_KEY'; // 确保安全存储

/**
 * 游戏桌基类 (GameTable)
 * 定义了游戏桌的基本行为：玩家加入、离开、游戏开始、结束、消息广播、结算等。
 * 游戏桌是玩家实际进行游戏的场所。
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

    // 发送消息到游戏桌内的所有玩家
    broadcast(event, data) {
        this.io.to(this.roomId).emit(event, data);
    }

    // 发送消息给特定玩家
    sendToPlayer(socketId, event, data) {
        this.io.to(socketId).emit(event, data);
    }

    // **[优化]** 签名函数：增加时间戳 (timestamp) 和随机数 (nonce)
    sign(data) {
        // 签名数据必须包含 batchId, timestamp, nonce, result, 以防止重放攻击
        return crypto.createHmac('sha256', SECRET_KEY)
            .update(JSON.stringify(data))
            .digest('hex');
    }

    // 异步结算 API 调用
    async settle(result) {
        // **[优化]** 生成唯一的 BatchId, timestamp, nonce
        const batchId = `${this.roomId}-${Date.now()}`;
        const timestamp = Date.now();
        const nonce = crypto.randomBytes(16).toString('hex');

        const settlementPayload = {
            batchId,
            timestamp,
            nonce,
            result, // 包含 winner, loser, amount 等详细信息
        };

        try {
            const signature = this.sign(settlementPayload);
            // Assuming the API is running on localhost for internal calls
            const apiUrl = process.env.API_URL || 'http://localhost:5000';
            await axios.post(`${apiUrl}/api/settle`, settlementPayload, {
                headers: {
                    "x-signature": signature
                }
            });
        } catch (err) {
            console.error(`Settlement failed for Table ${this.roomId}:`, err);
            // **[优化]** 即使异步请求失败，也需要记录，以便后续人工干预或重试
            // 建议：发送一个内部系统错误消息给当前游戏桌的所有玩家
            this.broadcast('system_error', { code: 'W005', message: '结算服务请求失败，请联系客服' });
        }
    }
}
module.exports = GameTable;
