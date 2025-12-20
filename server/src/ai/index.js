/**
 * AI 模块索引文件
 * 
 * 统一导出所有 AI 相关模块，方便其他地方引用
 * 
 * 文件位置: server/src/ai/index.js
 */

const AIPlayerManager = require('./AIPlayerManager');
const AIGameController = require('./AIGameController');
const ChessAIEngine = require('./ChessAIEngine');
const OpeningBook = require('./OpeningBook');

module.exports = {
    AIPlayerManager,
    AIGameController,
    ChessAIEngine,
    OpeningBook
};
