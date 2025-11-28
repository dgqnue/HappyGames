# 游戏匹配系统模板使用指南

## 概述

`BaseGameManager` 提供了一套完整的匹配系统模板方法，新游戏只需继承并调用即可快速实现匹配功能。

## 核心模板方法

### 1. `handleMatchFound(players, tier)`
**处理匹配成功的主方法**

- **功能**：
  - 优先查找并复用空闲游戏桌
  - 没有空桌时创建新桌，使用智能编号（填补空缺）
  - 将匹配成功的玩家加入游戏桌
  - 自动开始游戏（跳过准备检查）

- **参数**：
  - `players`: 匹配成功的玩家列表
  - `tier`: 游戏室等级（默认 'free'）

- **使用示例**：
```javascript
async handleMatchFound(players) {
    // 直接调用父类方法
    await super.handleMatchFound(players, 'free');
}
```

### 2. `findAvailableRoom(tier)`
**查找可用的空闲游戏桌**

- **功能**：在指定游戏室中查找 `idle` 状态且无玩家的游戏桌
- **返回**：可用的游戏桌对象或 `null`
- **可重写**：子类可以添加更多匹配条件检查

### 3. `findNextAvailableNumber(tier)`
**查找最小的可用编号**

- **功能**：智能分配游戏桌编号，优先填补已删除游戏桌留下的空缺
- **返回**：下一个可用的编号（数字）
- **示例**：
  - 现有游戏桌：0, 1, 2, 4, 5
  - 返回：3（填补空缺）

### 4. `autoStartGame(room)`
**自动开始游戏**

- **功能**：
  - 设置所有玩家为已准备状态
  - 延迟 1 秒后自动调用 `room.startGame()`
- **可重写**：子类可以自定义自动开始的行为

## 完整实现示例

### 中国象棋匹配系统实现

```javascript
// server/src/games/chinesechess/index.js
const BaseGameManager = require('../../gamecore/BaseGameManager');
const ChineseChessRoom = require('./rooms/ChineseChessRoom');
const AutoMatchManager = require('../../gamecore/AutoMatchManager');

class ChineseChessManager extends BaseGameManager {
    constructor(io) {
        super(io, 'chinesechess', ChineseChessRoom);
        
        // 创建自动匹配管理器
        this.autoMatcher = new AutoMatchManager();
        
        // 设置匹配成功回调
        this.autoMatcher.setMatchFoundHandler((gameType, players) => {
            this.handleMatchFound(players);
        });
    }

    /**
     * 匹配成功处理 - 使用父类模板
     */
    async handleMatchFound(players) {
        // 调用父类的模板方法，传入游戏室等级
        await super.handleMatchFound(players, 'free');
    }

    /**
     * 处理自动匹配请求
     */
    handleAutoMatch(socket, matchSettings) {
        const result = this.autoMatcher.joinQueue(
            this.gameType,
            socket,
            matchSettings
        );

        if (result.success) {
            socket.emit('match_queue_joined', {
                message: '已加入匹配队列',
                queueInfo: this.autoMatcher.getQueueInfo(this.gameType)
            });
        } else {
            socket.emit('match_failed', { message: result.error });
        }
    }

    /**
     * 玩家加入游戏管理器
     */
    onPlayerJoin(socket, user) {
        super.onPlayerJoin(socket, user);

        // 监听自动匹配请求
        socket.on('auto_match', (matchSettings) => {
            this.handleAutoMatch(socket, matchSettings);
        });

        // 监听取消匹配
        socket.on('cancel_match', () => {
            const userId = socket.user._id.toString();
            this.autoMatcher.leaveQueue(this.gameType, userId);
            socket.emit('match_cancelled');
        });
    }

    /**
     * 处理玩家断线
     */
    handleDisconnect(socket) {
        // 从匹配队列移除
        if (socket.user && socket.user._id) {
            this.autoMatcher.leaveQueue(this.gameType, socket.user._id.toString());
        }

        // 调用父类处理
        super.handleDisconnect(socket);
    }
}

module.exports = ChineseChessManager;
```

## 自定义匹配逻辑

### 重写 `findAvailableRoom` 添加自定义条件

```javascript
/**
 * 查找可用游戏桌 - 添加自定义匹配条件
 */
findAvailableRoom(tier) {
    const existingRooms = this.rooms[tier] || [];
    
    for (const existingRoom of existingRooms) {
        // 基础条件：空闲且无玩家
        if (existingRoom.matchState.status === 'idle' && 
            existingRoom.matchState.players.length === 0) {
            
            // 自定义条件：检查底豆设置是否匹配
            if (this.checkBetMatch(existingRoom, matchSettings)) {
                return existingRoom;
            }
        }
    }
    
    return null;
}
```

### 重写 `autoStartGame` 自定义开始逻辑

```javascript
/**
 * 自动开始游戏 - 自定义延迟时间
 */
autoStartGame(room) {
    room.matchState.players.forEach(p => p.ready = true);
    
    // 延迟 3 秒，给玩家更多准备时间
    setTimeout(() => {
        if (room.matchState.players.length === room.maxPlayers) {
            console.log(`Auto-starting game in room ${room.roomId}`);
            room.startGame();
        }
    }, 3000);
}
```

## 匹配流程说明

1. **玩家发起匹配**：客户端发送 `auto_match` 事件
2. **加入匹配队列**：`handleAutoMatch` 将玩家加入队列
3. **匹配成功**：`AutoMatchManager` 找到匹配的玩家
4. **调用回调**：触发 `handleMatchFound`
5. **查找空桌**：`findAvailableRoom` 查找可用游戏桌
6. **创建新桌**（如需要）：`findNextAvailableNumber` 分配编号
7. **玩家入座**：将匹配的玩家加入游戏桌
8. **自动开始**：`autoStartGame` 跳过准备检查，直接开始游戏

## 游戏结束后的处理

游戏结束后，`MatchableGameRoom.endGame` 会自动：
1. 延迟 5 秒给玩家查看结果
2. 踢出所有玩家
3. 从游戏管理器中删除游戏桌
4. 广播房间列表更新

这样可以确保游戏桌资源被正确回收，编号可以被复用。

## 新游戏快速接入

创建新游戏时，只需：

1. **继承 `BaseGameManager`**
2. **创建 `AutoMatchManager` 实例**
3. **设置匹配成功回调**
4. **实现 `handleMatchFound`**（通常只需调用父类方法）
5. **监听匹配相关事件**（`auto_match`, `cancel_match`）

就可以获得完整的匹配功能，包括：
- ✅ 优先复用空桌
- ✅ 智能编号分配
- ✅ 自动开始游戏
- ✅ 游戏结束后自动清理

## 注意事项

1. **游戏桌引用**：创建游戏桌后，务必设置 `room.gameManager = this`
2. **断线处理**：在 `handleDisconnect` 中记得从匹配队列移除玩家
3. **状态同步**：游戏桌状态变化会自动广播给大厅
4. **编号连续性**：删除游戏桌后，编号会被复用，保持紧凑

## 相关文件

- `server/src/gamecore/BaseGameManager.js` - 基础游戏管理器（包含模板方法）
- `server/src/gamecore/MatchableGameRoom.js` - 可匹配游戏桌基类
- `server/src/gamecore/AutoMatchManager.js` - 自动匹配管理器
- `server/src/games/chinesechess/index.js` - 中国象棋实现示例
