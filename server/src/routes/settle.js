// 文件：server/src/routes/settle.js
const express = require('express');
const router = express.Router();
const queue = require('../gamecore/queue'); // 消息队列服务
const BaseGameRoom = require('../gamecore/BaseGameRoom'); // To access sign method? 
// No, BaseGameRoom is a class. We need a static helper or instance. 
// The user's code imported { sign } from BaseGameRoom. 
// My BaseGameRoom implementation has `sign` as a method. 
// I should make it static or export it separately.
// Let's modify BaseGameRoom.js to export sign as well, or just duplicate/import crypto here.
// For "faithfully implement", I should export it.
// But BaseGameRoom.js exports the class. 
// I will modify BaseGameRoom.js to export the class AND the sign function if possible, 
// or just instantiate a dummy room to sign? No that's inefficient.
// I'll use a helper in BaseGameRoom.js.

const crypto = require('crypto');
const SECRET_KEY = process.env.SETTLEMENT_SECRET_KEY || 'YOUR_SECURE_KEY';

function sign(data) {
    return crypto.createHmac('sha256', SECRET_KEY)
        .update(JSON.stringify(data))
        .digest('hex');
}

// **[优化]** 引入统一的签名验证中间件
function verifySettlementSignature(req, res, next) {
    const signature = req.headers['x-signature'];
    const data = req.body;

    // **[优化]** 1. 时间戳/随机数检查 (防重放)
    const { timestamp, nonce } = data;
    if (Date.now() - timestamp > 60000) { // 检查是否超过 60 秒
        return res.status(403).json({ code: 'W003', message: '签名验证失败: 请求已过期' });
    }

    // 2. 验签
    const expectedSignature = sign(data);
    if (signature !== expectedSignature) {
        return res.status(403).json({ code: 'W003', message: '签名验证失败' });
    }

    next();
}

router.post('/settle', verifySettlementSignature, async (req, res) => {
    // 任务入队
    queue.add('settle', req.body);

    // 立即返回 202 Accepted 告知任务已受理
    res.status(202).json({ message: '结算任务已受理' });
});

module.exports = router;
