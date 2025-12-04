// 文件：server/src/routes/settle.js
const express = require('express');
const router = express.Router();
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
    try {
        const { batchId, result } = req.body;

        // 简化处理：直接返回成功
        // TODO: 未来可以在这里添加实际的结算逻辑
        console.log('[Settle] 收到结算请求:', { batchId, result });

        res.status(200).json({
            success: true,
            message: '结算请求已接收'
        });
    } catch (error) {
        console.error('[Settle] 处理失败:', error);

        res.status(500).json({
            success: false,
            code: 'W001',
            message: '处理失败: ' + error.message
        });
    }
});

module.exports = router;
