// server/src/games/chinesechess/index.js
const BaseGameManager = require('../../gamecore/BaseGameManager');
const ChineseChessRoom = require('./rooms/ChineseChessRoom');

class ChineseChessManager extends BaseGameManager {
    constructor(io) {
        // 调用父类构造函数：io, 游戏类型, 房间类
        // 注意：游戏类型必须是 'chinesechess'，与事件前缀匹配
        super(io, 'chinesechess', ChineseChessRoom);
    }

    // BaseGameManager 已经实现了所有通用逻辑：
    // - initRooms: 自动创建房间
    // - onPlayerJoin: 处理玩家加入
    // - handleJoin: 处理加入房间（包含等级分验证）
    // - handleDisconnect: 处理断线
    // - getRoomList: 获取房间列表
    // - setupRoomListeners: 设置事件监听（move, leave等）
}

module.exports = ChineseChessManager;
