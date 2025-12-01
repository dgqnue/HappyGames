# 🎯 游戏匹配系统使用指南

## 📋 目录
1. [概述](#概述)
2. [核心功能](#核心功能)
3. [服务端集成](#服务端集成)
4. [客户端集成](#客户端集成)
5. [完整示例](#完整示例)
6. [事件流程](#事件流程)

---

## 概述

匹配系统提供了两种玩家匹配方式：
1. **自动匹配**：根据玩家设置的条件自动匹配合适的对手
2. **手动入座**：玩家主动选择游戏桌入座

### 核心特性

- ✅ **匹配条件设置**：底豆、胜率、掉线率
- ✅ **自动匹配队列**：智能匹配算法
- ✅ **准备/开始机制**：30秒倒计时
- ✅ **僵尸桌清理**：5分钟无匹配自动清理
- ✅ **旁观功能**：仅显示公共信息
- ✅ **再来一局**：游戏结束后快速开始新局

---

## 核心功能

### 1. 匹配条件

玩家可以设置以下匹配条件：

| 条件 | 默认值 | 范围 | 说明 |
|------|--------|------|------|
| **游戏底豆** | 1000 | 100-100,000 | 本局游戏的底豆数量 |
| **底豆范围** | 500-5000 | 100-100,000 | 可接受的对手底豆范围 |
| **胜率范围** | 0-100% | 0-100% | 可接受的对手胜率范围 |
| **最大掉线率** | 100% | 0-100% | 对手的最大掉线率 |
| **等级分范围** ⭐ | 无限制 | 0-3000 | 对手的等级分范围（可选） |

#### ⭐ 重要说明：匹配条件的作用范围

**匹配条件控制的是单个游戏桌（Game Table），而不是整个游戏室（Game Room）**：

- ✅ 每个游戏桌都有独立的匹配条件
- ✅ 第一个入座的玩家设置该桌的匹配标准
- ✅ 后续玩家必须符合第一个玩家设置的条件才能入座
- ✅ 不同游戏桌的匹配条件互不影响
- ✅ 游戏桌清空后，匹配条件重置为默认值

**示例**：
```
游戏室：初级室（chinesechess_beginner）

游戏桌 A（chinesechess_beginner_0）：
  - 第一个玩家设置：胜率 40-60%，掉线率 ≤ 20%，等级分 1200-1800
  - 后续玩家必须符合这些条件才能入座

游戏桌 B（chinesechess_beginner_1）：
  - 第一个玩家设置：胜率 60-80%，掉线率 ≤ 10%，等级分 1500-2000
  - 后续玩家必须符合这些条件才能入座

两个桌子的条件完全独立，互不影响！
```

### 2. 自动匹配流程

```
1. 玩家设置匹配条件
   ↓
2. 加入匹配队列
   ↓
3. 系统每3秒检查一次队列
   ↓
4. 找到符合条件的对手
   ↓
5. 创建房间并通知双方
   ↓
6. 进入准备阶段
```

### 3. 手动入座流程

```
1. 玩家查看房间列表
   ↓
2. 选择合适的房间入座
   ↓
3. 等待其他玩家入座
   ↓
4. 满座后进入准备阶段（30秒倒计时）
   ↓
5. 所有玩家点击"开始"或倒计时结束
   ↓
6. 游戏开始
```

### 4. 准备/开始机制

- **触发条件**：房间满座（达到 `maxPlayers`）
- **倒计时**：30秒
- **规则**：
  - 所有玩家都点击"开始"：立即开始游戏
  - 倒计时结束：未点击"开始"的玩家被踢出
  - 任一玩家离座：取消倒计时，重新等待满座

### 5. 僵尸桌清理

- **触发条件**：第一个玩家入座后5分钟内未开始游戏
- **清理动作**：踢出所有玩家，重置房间状态
- **通知**：被踢玩家收到 `kicked` 事件

### 6. 旁观功能

- **限制**：仅显示公共游戏状态（牌桌公共区域）
- **隐藏**：玩家手牌等私密信息
- **目的**：防止"通牌"作弊

---

## 服务端集成

### 1. 使用 MatchableGameRoom

```javascript
// server/src/games/mygame/rooms/MyGameRoom.js
const MatchableGameRoom = require('../../../gamecore/MatchableGameRoom');

class MyGameRoom extends MatchableGameRoom {
    constructor(roomId, io, tier) {
        // maxPlayers: 游戏所需玩家数量（重要！）
        super(io, roomId, 2, tier); // 2人游戏
        
        this.gameType = 'mygame';
        
        // 初始化游戏特定状态
        this.board = null;
        this.turn = null;
    }

    /**
     * 游戏开始回调（必须实现）
     */
    onGameStart() {
        // 初始化游戏状态
        this.board = this.createInitialBoard();
        this.turn = 0;
        
        // 发送初始状态给所有玩家
        this.matchState.players.forEach((player, index) => {
            this.sendToPlayer(player.socketId, 'game_state', {
                board: this.board,
                turn: this.turn,
                mySide: index,
                players: this.matchState.players
            });
        });
    }

    /**
     * 获取公共游戏状态（用于旁观）
     */
    getPublicGameState() {
        return {
            status: this.matchState.status,
            players: this.matchState.players.map(p => ({
                nickname: p.nickname,
                title: p.title
            })),
            board: this.getPublicBoard(), // 只返回公共信息
            turn: this.turn
        };
    }

    /**
     * 处理游戏移动
     */
    handleMove(socket, move) {
        // 验证移动
        if (!this.isValidMove(move)) {
            socket.emit('error', { message: 'Invalid move' });
            return;
        }

        // 执行移动
        this.applyMove(move);

        // 广播移动
        this.broadcast('move', {
            move,
            board: this.board,
            turn: this.turn
        });

        // 检查游戏是否结束
        const winner = this.checkWinner();
        if (winner !== null) {
            this.endGame({ winner });
        }
    }
}

module.exports = MyGameRoom;
```

### 2. 集成 AutoMatchManager

```javascript
// server/src/games/mygame/index.js
const BaseGameManager = require('../../gamecore/BaseGameManager');
const AutoMatchManager = require('../../gamecore/AutoMatchManager');
const MyGameRoom = require('./rooms/MyGameRoom');

class MyGameManager extends BaseGameManager {
    constructor(io) {
        super(io, 'mygame', MyGameRoom);
        
        // 创建自动匹配管理器
        this.autoMatcher = new AutoMatchManager();
        
        // 设置匹配成功回调
        this.autoMatcher.setMatchFoundHandler((gameType, players) => {
            this.handleMatchFound(players);
        });
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
     * 匹配成功处理
     */
    handleMatchFound(players) {
        // 创建新房间
        const tier = 'free'; // 或根据底豆确定等级
        const roomId = `${this.gameType}_${tier}_${this.rooms[tier].length}`;
        const room = new MyGameRoom(roomId, this.io, tier);
        this.rooms[tier].push(room);

        // 将玩家加入房间
        players.forEach(player => {
            room.playerJoin(player.socket, player.settings);
            player.socket.emit('match_found', {
                roomId: room.roomId,
                message: '匹配成功！'
            });
        });
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
}

module.exports = MyGameManager;
```

---

## 客户端集成

### 1. 使用 MatchSettingsPanel

```tsx
// client/src/app/game/mygame/page.tsx
import { MatchSettingsPanel } from '@/components/GameTemplates/MatchSettingsPanel';

export default function MyGameCenter() {
    const [showMatchSettings, setShowMatchSettings] = useState(false);
    const [socket, setSocket] = useState<Socket | null>(null);

    const handleStartAutoMatch = (settings: MatchSettings) => {
        if (!socket) return;
        
        // 发送自动匹配请求
        socket.emit('auto_match', settings);
        
        // 监听匹配结果
        socket.on('match_queue_joined', (data) => {
            console.log('已加入匹配队列:', data);
            setShowMatchSettings(false);
            // 显示匹配中界面
        });
        
        socket.on('match_found', (data) => {
            console.log('匹配成功:', data);
            // 跳转到游戏房间
            router.push(`/game/mygame/play?roomId=${data.roomId}`);
        });
    };

    return (
        <div>
            {showMatchSettings ? (
                <MatchSettingsPanel
                    onStartMatch={handleStartAutoMatch}
                    onCancel={() => setShowMatchSettings(false)}
                />
            ) : (
                <button onClick={() => setShowMatchSettings(true)}>
                    自动匹配
                </button>
            )}
        </div>
    );
}
```

### 2. 房间内准备/开始

```tsx
// client/src/app/game/mygame/play/page.tsx
export default function MyGamePlay() {
    const [isReady, setIsReady] = useState(false);
    const [readyTimer, setReadyTimer] = useState<number | null>(null);

    useEffect(() => {
        if (!socket) return;

        // 监听准备检查开始
        socket.on('ready_check_start', (data) => {
            console.log('准备检查开始:', data);
            setReadyTimer(data.timeout / 1000); // 转换为秒
        });

        // 监听房间状态更新
        socket.on('room_state', (state) => {
            console.log('房间状态:', state);
            // 更新UI显示其他玩家的准备状态
        });

        // 监听被踢出
        socket.on('kicked', (data) => {
            alert(data.reason);
            router.push('/game/mygame');
        });

        // 监听游戏开始
        socket.on('game_start', (data) => {
            console.log('游戏开始!', data);
            setReadyTimer(null);
        });

    }, [socket]);

    const handleReady = () => {
        if (!socket) return;
        socket.emit('player_ready');
        setIsReady(true);
    };

    return (
        <div>
            {readyTimer !== null && (
                <div className="ready-check">
                    <p>请在 {readyTimer} 秒内点击开始</p>
                    <button 
                        onClick={handleReady}
                        disabled={isReady}
                    >
                        {isReady ? '已准备' : '开始游戏'}
                    </button>
                </div>
            )}
        </div>
    );
}
```

---

## 完整示例

### 服务端事件流程

```javascript
// 1. 玩家加入房间（手动入座）
socket.on('join_room', async ({ roomId, matchSettings }) => {
    const room = findRoom(roomId);
    await room.playerJoin(socket, matchSettings);
});

// 2. 玩家准备
socket.on('player_ready', () => {
    room.playerReady(socket);
});

// 3. 玩家取消准备
socket.on('player_unready', () => {
    room.playerUnready(socket);
});

// 4. 玩家离座
socket.on('leave_room', () => {
    room.playerLeave(socket);
});

// 5. 旁观
socket.on('spectate', ({ roomId }) => {
    const room = findRoom(roomId);
    room.spectatorJoin(socket);
});
```

### 客户端事件流程

```typescript
// 1. 接收房间状态
socket.on('room_state', (state) => {
    // 更新房间UI
});

// 2. 准备检查开始
socket.on('ready_check_start', (data) => {
    // 显示倒计时
});

// 3. 游戏开始
socket.on('game_start', (data) => {
    // 初始化游戏界面
});

// 4. 被踢出
socket.on('kicked', (data) => {
    // 显示原因并返回大厅
});

// 5. 游戏结束
socket.on('game_over', (result) => {
    // 显示结算界面
});
```

---

## 事件流程图

### 自动匹配流程

```
客户端                    服务端
  |                         |
  |-- auto_match ---------->|  加入匹配队列
  |<-- match_queue_joined --|
  |                         |
  |      (等待匹配...)      |
  |                         |
  |<-- match_found ---------|  匹配成功
  |                         |
  |-- join_room ----------->|  加入房间
  |<-- room_state ----------|
  |                         |
  |<-- ready_check_start ---|  开始准备检查
  |                         |
  |-- player_ready -------->|  玩家准备
  |                         |
  |<-- game_start ----------|  游戏开始
```

### 手动入座流程

```
客户端                    服务端
  |                         |
  |-- get_rooms ----------->|  获取房间列表
  |<-- room_list -----------|
  |                         |
  |-- join_room ----------->|  加入指定房间
  |<-- room_state ----------|
  |                         |
  |      (等待满座...)      |
  |                         |
  |<-- ready_check_start ---|  满座，开始准备检查
  |                         |
  |-- player_ready -------->|  玩家准备
  |<-- room_state ----------|  广播准备状态
  |                         |
  |<-- game_start ----------|  所有人准备或超时
```

---

## 最佳实践

### 1. 服务端

```javascript
// ✅ 推荐：使用 MatchableGameRoom
class MyGameRoom extends MatchableGameRoom {
    constructor(roomId, io, tier) {
        super(io, roomId, 2, tier); // 明确指定玩家数量
    }
}

// ❌ 不推荐：从头实现所有逻辑
class MyGameRoom {
    // 大量重复代码...
}
```

### 2. 客户端

```typescript
// ✅ 推荐：使用 MatchSettingsPanel
<MatchSettingsPanel onStartMatch={handleMatch} />

// ❌ 不推荐：手动构建表单
<form>
  {/* 大量表单代码... */}
</form>
```

### 3. 玩家数量配置

```javascript
// 不同游戏的玩家数量
const PLAYER_COUNTS = {
    chess: 2,        // 象棋：2人
    gomoku: 2,       // 五子棋：2人
    mahjong: 4,      // 麻将：4人
    poker: 6,        // 扑克：最多6人
};

// 在构造函数中使用
super(io, roomId, PLAYER_COUNTS.mahjong, tier);
```

---

## 总结

使用匹配系统模板，您可以：

1. **快速集成**：10分钟完成匹配系统集成
2. **标准化**：所有游戏使用统一的匹配逻辑
3. **可配置**：灵活的玩家数量和匹配条件
4. **防作弊**：内置旁观限制和僵尸桌清理
5. **用户友好**：30秒准备机制和清晰的提示

---

**Happy Matching! 🎯**

---

## 📊 掉线率自动统计系统

### 概述

掉线率自动统计系统会在每次游戏后自动计算并记录玩家的掉线次数，用于匹配条件验证。

**核心原则**：
- ✅ 只有在**游戏进行中**断线才计入掉线率
- ✅ 等待中、准备中离开不计入掉线
- ✅ 每次断线后自动更新数据库
- ✅ 掉线率 = (掉线次数 / 总对局数) × 100%

---

### 1. 数据库模型

#### UserGameStats 模型更新

```javascript
// server/src/models/UserGameStats.js
const UserGameStatsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    gameType: { type: String, required: true },
    rating: { type: Number, default: 1200 },
    gamesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    disconnects: { type: Number, default: 0 },  // ⭐ 新增：掉线次数
    lastPlayedAt: { type: Date, default: Date.now },
    title: { type: String, default: '初出茅庐' },
    titleRank: { type: Number, default: 1 },
    titleColor: { type: String, default: '#000000' }  // ⭐ 新增：称号颜色
});
```

---

### 2. 掉线统计服务

#### DisconnectTracker 服务

位置：`server/src/gamecore/DisconnectTracker.js`

**主要方法**：

```javascript
// 记录掉线（只有游戏中断线才计入）
await DisconnectTracker.recordDisconnect(userId, gameType, wasInGame);

// 获取掉线率
const rate = await DisconnectTracker.getDisconnectRate(userId, gameType);

// 获取完整统计（包括掉线率）
const stats = await DisconnectTracker.getPlayerStats(userId, gameType);

// 重置掉线记录（管理员功能）
await DisconnectTracker.resetDisconnects(userId, gameType);
```

**返回数据结构**：

```javascript
{
    gamesPlayed: 100,      // 总对局数
    wins: 55,              // 胜场
    losses: 40,            // 负场
    draws: 5,              // 平局
    disconnects: 5,        // 掉线次数 ⭐
    rating: 1500,          // 等级分
    title: "棋坛新秀",     // 称号
    titleColor: "#4CAF50", // 称号颜色
    winRate: 55.0,         // 胜率 (%)
    disconnectRate: 5.0    // 掉线率 (%) ⭐
}
```

---

### 3. 自动记录机制

#### 在 MatchableGameRoom 中集成

```javascript
// server/src/gamecore/MatchableGameRoom.js

/**
 * 处理玩家断线
 * ⭐ 自动记录掉线统计
 */
async handlePlayerDisconnect(socket) {
    const userId = socket.user._id.toString();
    
    console.log(`[MatchRoom] Player ${socket.user.username} disconnected`);
    
    // 检查玩家是否在游戏中
    const wasInGame = this.matchState.status === 'playing';
    
    // 如果在游戏中断线，记录掉线统计
    if (wasInGame) {
        try {
            await DisconnectTracker.recordDisconnect(
                socket.user._id,
                this.gameType,
                true // wasInGame = true
            );
            console.log(`[MatchRoom] Disconnect recorded`);
        } catch (error) {
            console.error(`[MatchRoom] Failed to record disconnect:`, error);
        }
    }
    
    // 移除玩家
    this.playerLeave(socket);
    
    // 如果是游戏中断线，可能需要特殊处理（如判对手获胜）
    if (wasInGame) {
        this.onPlayerDisconnectDuringGame(userId);
    }
}

/**
 * 游戏中断线的特殊处理（子类可重写）
 */
onPlayerDisconnectDuringGame(userId) {
    // 子类可以重写此方法来处理游戏中断线的逻辑
    // 例如：判对手获胜、暂停游戏等
    console.log(`[MatchRoom] Player ${userId} disconnected during game`);
}
```

---

### 4. 调用流程

```
玩家断线
  ↓
handlePlayerDisconnect()
  ↓
检查游戏状态
  ├─ 游戏中 (status === 'playing')
  │   ├─ 调用 DisconnectTracker.recordDisconnect()
  │   ├─ disconnects +1
  │   ├─ 计算新的掉线率
  │   └─ 调用 onPlayerDisconnectDuringGame()
  └─ 非游戏中
      └─ 不记录掉线
  ↓
移除玩家（playerLeave）
```

---

### 5. 使用示例

#### 服务端（GameManager）

```javascript
// 在 BaseGameManager 或具体游戏的 Manager 中
class ChineseChessManager extends BaseGameManager {
    handleDisconnect(socket, room) {
        console.log(`Player disconnected`);
        
        if (room) {
            // 自动记录掉线统计
            room.handlePlayerDisconnect(socket);
        }
    }
}
```

#### 服务端（GameRoom）

```javascript
// 在具体游戏的 Room 中重写断线处理
class ChineseChessRoom extends MatchableGameRoom {
    onPlayerDisconnectDuringGame(userId) {
        // 游戏中断线的特殊处理
        console.log(`Player ${userId} disconnected during game`);
        
        // 判对手获胜
        const opponent = this.matchState.players.find(p => p.userId !== userId);
        if (opponent) {
            this.endGame({
                winner: opponent.userId,
                reason: 'opponent_disconnected'
            });
        }
    }
}
```

#### 客户端（查看统计）

```typescript
// 获取玩家统计信息
useEffect(() => {
    socket.emit('get_stats', { gameType: 'chinesechess' });
    
    socket.on('user_stats', (stats) => {
        console.log('玩家统计:', stats);
        console.log('掉线率:', stats.disconnectRate + '%');
    });
}, []);
```

---

### 6. 日志输出示例

```
[MatchRoom] Player Alice disconnected from room chinesechess_free_0
[MatchRoom] Disconnect recorded for player Alice
[DisconnectTracker] Recorded disconnect for user 507f1f77bcf86cd799439011 in chinesechess
[DisconnectTracker] Total disconnects: 3, Games played: 50, Rate: 6.0%
[MatchRoom] Player 507f1f77bcf86cd799439011 disconnected during game
```

---

### 7. 匹配条件验证

掉线率会在玩家尝试入座时自动验证：

```javascript
// MatchRoomState.js - canPlayerJoin()

// 检查玩家的掉线率是否符合第一个玩家的要求
const disconnectRate = playerStats.gamesPlayed > 0
    ? (playerStats.disconnects / playerStats.gamesPlayed) * 100
    : 0;

if (disconnectRate > maxDisconnectRate) {
    console.log(`[MatchRoom] Player rejected: disconnectRate ${disconnectRate.toFixed(1)}% exceeds max ${maxDisconnectRate}%`);
    return false;
}
```

**示例**：
```
第一个玩家设置：最大掉线率 20%

玩家 A 尝试入座：
  - 总对局：100场
  - 掉线次数：15次
  - 掉线率：15%
  - ✅ 符合条件，允许入座

玩家 B 尝试入座：
  - 总对局：100场
  - 掉线次数：25次
  - 掉线率：25%
  - ❌ 超过限制，拒绝入座
```

---

### 8. 关键特性

1. **智能判断**：只有游戏进行中断线才计入掉线率
2. **自动计算**：每次断线后自动更新统计数据
3. **精确统计**：掉线率 = 掉线次数 / 总对局数
4. **防作弊**：等待中或准备中离开不计入掉线
5. **可扩展**：子类可重写 `onPlayerDisconnectDuringGame` 处理特殊逻辑
6. **管理员功能**：支持重置掉线记录

---

### 9. 完整数据流

```
游戏开始
  ↓
玩家 A 断线
  ↓
handlePlayerDisconnect(socketA)
  ↓
检测到 status === 'playing'
  ↓
DisconnectTracker.recordDisconnect(userIdA, 'chinesechess', true)
  ↓
数据库更新：
  - disconnects: 5 → 6
  - disconnectRate: 5.0% → 6.0%
  ↓
onPlayerDisconnectDuringGame(userIdA)
  ↓
判玩家 B 获胜
  ↓
endGame({ winner: userIdB, reason: 'opponent_disconnected' })
```

---

## 总结

现在系统已经完整实现了：

1. ✅ **游戏桌级别的匹配条件**：每个桌子独立，由第一个玩家设置
2. ✅ **等级分范围筛选**：可选的等级分匹配条件
3. ✅ **自动掉线统计**：游戏中断线自动记录
4. ✅ **掉线率计算**：自动计算并存储在数据库
5. ✅ **匹配条件验证**：后续玩家必须符合掉线率限制
6. ✅ **完整的日志**：方便调试和监控
7. ✅ **可扩展性**：子类可重写断线处理逻辑

所有功能都已经模板化，新游戏只需继承 `MatchableGameRoom` 即可自动获得这些功能！🎉

---

**Happy Coding! 🚀**
