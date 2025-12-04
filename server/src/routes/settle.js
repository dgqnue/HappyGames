// 文件：server/src/routes/settle.js
const express = require('express');
const router = express.Router();
const WalletService = require('../services/WalletService');
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
        const { winner, loser, amount } = result;

        // 直接处理结算，不使用队列
        await WalletService.transferBeans(winner, loser, amount, batchId);

        res.status(200).json({
            success: true,
            message: '结算成功'
        });
    } catch (error) {
        console.error('[Settle] 结算失败:', error);

        // 处理重复批次ID错误（幂等性）
        if (error.message && error.message.includes('W002')) {
            return res.status(200).json({
                success: true,
                message: '结算已处理（幂等）'
            });
        }

        res.status(500).json({
            success: false,
            code: 'W001',
            message: '结算失败: ' + error.message
        });
    }
});

module.exports = router;
