# 快速参考指南

本文档提供常见任务的快速参考。

---

## 📁 文件位置速查

### 核心模块
```
core/
├── network/
│   ├── SocketServer.js      # Socket 连接管理
│   └── HttpService.js       # HTTP API 服务
├── matching/
│   └── MatchMaker.js        # 匹配系统
├── hierarchy/
│   ├── GameManager.js       # 游戏管理器基类
│   ├── GameTier.js          # 游戏室类
│   └── GameTable.js         # 游戏桌基类
└── game/
    └── GameLoader.js        # 游戏加载器
```

### 游戏实现
```
games/
└── chinesechess/
    ├── ChineseChessManager.js      # 象棋管理器
    └── rooms/
        └── ChineseChessRoom.js     # 象棋游戏桌
```

---

## 🎮 添加新游戏

### 1. 创建游戏目录
```bash
mkdir server/src/games/mygame
mkdir server/src/games/mygame/rooms
```

### 2. 创建游戏管理器
```javascript
// server/src/games/mygame/MyGameManager.js
const GameManager = require('../../core/hierarchy/GameManager');
const MyGameTable = require('./rooms/MyGameTable');

class MyGameManager extends GameManager {
    constructor(io, matchMaker) {
        super(io, 'mygame', MyGameTable, matchMaker);
    }
}

module.exports = MyGameManager;
```

### 3. 创建游戏桌
```javascript
// server/src/games/mygame/rooms/MyGameTable.js
const GameTable = require('../../../core/hierarchy/GameTable');

class MyGameTable extends GameTable {
    constructor(io, tableId, tier) {
        super(io, tableId, 'mygame', 2, tier); // 2 = 最大玩家数
    }
    
    onGameStart() {
        // 游戏开始逻辑
    }
    
    onGameEnd(result) {
        // 游戏结束逻辑
    }
    
    onPlayerDisconnectDuringGame(userId) {
        // 断线处理逻辑
    }
}

module.exports = MyGameTable;
```

### 4. 重启服务器
游戏会自动加载，无需修改其他文件！

---

## 🔌 Socket 事件速查

### 客户端发送的事件

| 事件名 | 数据 | 说明 |
|-------|------|------|
| `start_game` | `'gameType'` | 开始游戏 |
| `get_rooms` | `{ tier: 'free' }` | 获取房间列表 |
| `<game>_join` | `{ tier, roomId }` | 加入游戏桌 |
| `<game>_leave` | - | 离开游戏桌 |
| `auto_match` | `{ settings }` | 自动匹配 |
| `cancel_match` | - | 取消匹配 |
| `player_ready` | - | 玩家准备 |
| `<game>_move` | `moveData` | 游戏移动 |

### 服务器发送的事件

| 事件名 | 数据 | 说明 |
|-------|------|------|
| `room_list` | `Array<RoomInfo>` | 房间列表 |
| `match_queue_joined` | `{ message }` | 已加入匹配队列 |
| `match_found` | `{ roomId }` | 匹配成功 |
| `match_cancelled` | - | 匹配已取消 |
| `player_joined` | `{ player }` | 玩家加入 |
| `player_left` | `{ userId }` | 玩家离开 |
| `player_ready` | `{ userId }` | 玩家准备 |
| `game_start` | `gameData` | 游戏开始 |
| `game_over` | `result` | 游戏结束 |
| `error` | `{ message }` | 错误 |

---

## 🎯 常用方法速查

### GameManager 方法

```javascript
// 初始化游戏室（可重写）
initTiers() {
    this.createTier('free', '免豆室', 0, Infinity);
}

// 创建游戏室
createTier(id, name, minRating, maxRating) { }

// 处理玩家加入（可重写添加自定义事件）
onPlayerJoin(socket) {
    super.onPlayerJoin(socket);
    // 添加自定义事件监听
}

// 处理匹配成功（可重写）
handleMatchFound(players) { }
```

### GameTable 方法

```javascript
// 玩家入座
async join(socket, options) { }

// 玩家离开
leave(socket) { }

// 玩家准备
playerReady(socket) { }

// 开始游戏
startGame() { }

// 结束游戏
endGame(result) { }

// 广播消息
broadcast(event, data) { }

// 发送给特定玩家
sendToPlayer(socketId, event, data) { }

// 执行结算
async settle(result) { }
```

### 钩子方法（必须实现）

```javascript
// 游戏开始时调用
onGameStart() {
    // 初始化游戏状态
    // 发送初始数据给玩家
}

// 游戏结束时调用
onGameEnd(result) {
    // 清理游戏状态
}

// 游戏中玩家断线时调用
onPlayerDisconnectDuringGame(userId) {
    // 判断对手获胜或暂停游戏
}
```

---

## 🗂️ 数据结构速查

### 玩家信息 (PlayerInfo)
```javascript
{
    userId: String,        // 用户 ID
    socketId: String,      // Socket ID
    nickname: String,      // 昵称
    avatar: String,        // 头像 URL
    ready: Boolean         // 是否准备
}
```

### 房间信息 (RoomInfo)
```javascript
{
    id: String,            // 房间 ID
    status: String,        // 状态: 'idle' | 'playing' | 'finished'
    players: Number,       // 当前玩家数
    spectators: Number,    // 旁观者数
    maxPlayers: Number     // 最大玩家数
}
```

### 游戏结果 (GameResult)
```javascript
{
    winner: String,        // 获胜方标识
    winnerId: String,      // 获胜者 ID
    loserId: String,       // 失败者 ID
    elo: Object           // ELO 变化
}
```

---

## 🔧 配置速查

### 游戏室配置
```javascript
// 免豆室 - 无限制
this.createTier('free', '免豆室', 0, Infinity);

// 初级室 - 0-1500 分
this.createTier('beginner', '初级室', 0, 1500);

// 中级室 - 1500-1800 分
this.createTier('intermediate', '中级室', 1500, 1800);

// 高级室 - 1800+ 分
this.createTier('advanced', '高级室', 1800, Infinity);
```

### 匹配器配置
```javascript
// 匹配检查间隔（毫秒）
const MATCH_INTERVAL = 3000; // 3 秒

// 在 MatchMaker.js 中修改
this.checkInterval = setInterval(() => {
    this.processQueues();
}, MATCH_INTERVAL);
```

---

## 📊 状态机速查

### 游戏桌状态
```
idle (空闲)
  ↓ 玩家加入并准备
playing (游戏中)
  ↓ 游戏结束
finished (已结束)
  ↓ 自动重置
idle (空闲)
```

### 玩家状态
```
未入座
  ↓ join()
已入座 (ready: false)
  ↓ playerReady()
已准备 (ready: true)
  ↓ startGame()
游戏中
  ↓ endGame()
已入座 (ready: false)
```

---

## 🐛 调试技巧

### 查看日志
```javascript
// 所有日志都带有模块前缀
[SocketServer] ...
[GameLoader] ...
[GameManager] ...
[MatchMaker] ...
[ChineseChess] ...
```

### 常见问题排查

**问题：游戏没有自动加载**
```bash
# 检查文件名
# 必须是 <GameName>Manager.js 或 index.js
ls server/src/games/mygame/
```

**问题：匹配不成功**
```javascript
// 检查匹配器是否注册
console.log(matchMaker.handlers.has('mygame')); // 应该是 true
```

**问题：玩家无法加入游戏桌**
```javascript
// 检查等级分限制
const tier = this.tiers.get('beginner');
console.log(tier.canAccess(playerRating)); // 应该是 true
```

---

## 📝 代码片段

### 发送游戏开始消息
```javascript
onGameStart() {
    this.players.forEach((player, index) => {
        this.sendToPlayer(player.socketId, 'game_start', {
            board: this.board,
            mySide: index === 0 ? 'a' : 'b',
            players: this.players.map(p => ({
                userId: p.userId,
                nickname: p.nickname
            }))
        });
    });
}
```

### 处理游戏移动
```javascript
handleMove(socket, move) {
    // 1. 验证是否是玩家的回合
    const player = this.players.find(p => p.socketId === socket.id);
    if (!player) return;
    
    // 2. 验证移动合法性
    if (!this.isValidMove(move)) {
        socket.emit('error', { message: '非法移动' });
        return;
    }
    
    // 3. 执行移动
    this.applyMove(move);
    
    // 4. 广播移动
    this.broadcast('move', { move });
    
    // 5. 检查游戏是否结束
    if (this.checkWin()) {
        this.handleWin(player.userId);
    }
}
```

### 处理胜利
```javascript
async handleWin(winnerId) {
    const loserId = this.players.find(p => p.userId !== winnerId).userId;
    
    // 1. ELO 结算
    const eloResult = await EloService.processMatchResult(
        this.gameType, winnerId, loserId, 1
    );
    
    // 2. 游戏豆结算（如果不是免费室）
    if (this.tier !== 'free') {
        await this.settle({
            winner: winnerId,
            loser: loserId,
            amount: this.getBetAmount()
        });
    }
    
    // 3. 结束游戏
    this.endGame({
        winner: winnerId,
        loser: loserId,
        elo: eloResult
    });
}
```

---

## 🔗 相关文档

- **架构说明**: `ARCHITECTURE.md`
- **模块索引**: `MODULE_INDEX.md`
- **迁移指南**: `MIGRATION_GUIDE.md`
- **完成总结**: `REFACTORING_SUMMARY.md`

---

## 💡 最佳实践

### 1. 命名规范
- 游戏类型：小写，如 `'chinesechess'`
- 类名：大驼峰，如 `ChineseChessManager`
- 文件名：大驼峰，如 `ChineseChessManager.js`

### 2. 错误处理
```javascript
try {
    // 业务逻辑
} catch (err) {
    console.error('[ModuleName] 错误描述:', err);
    socket.emit('error', { message: '用户友好的错误消息' });
}
```

### 3. 日志格式
```javascript
console.log(`[ModuleName] 操作描述: ${details}`);
```

### 4. 注释规范
```javascript
/**
 * 方法说明
 * @param {Type} paramName - 参数说明
 * @returns {Type} 返回值说明
 */
```

---

## 🚀 性能优化建议

1. **使用 Map 而不是普通对象**
   ```javascript
   // 好
   this.players = new Map();
   
   // 避免
   this.players = {};
   ```

2. **及时清理监听器**
   ```javascript
   socket.removeAllListeners('event_name');
   ```

3. **批量操作使用 Promise.all**
   ```javascript
   await Promise.all(players.map(p => p.save()));
   ```

---

**最后更新：** 2025-11-30  
**版本：** 1.0
