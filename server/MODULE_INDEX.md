# 模块职责索引

本文档列出了重构后所有核心模块的职责和关系。

## 核心模块总览

| 模块分类 | 模块名称 | 文件路径 | 主要职责 |
|---------|---------|---------|---------|
| **网络通信** | SocketServer | `core/network/SocketServer.js` | Socket.IO 连接管理、鉴权、事件分发 |
| **网络通信** | HttpService | `core/network/HttpService.js` | HTTP API 服务、房间列表查询 |
| **匹配系统** | MatchMaker | `core/matching/MatchMaker.js` | 匹配队列管理、匹配算法执行 |
| **游戏层级** | GameManager | `core/hierarchy/GameManager.js` | 游戏总管理器、协调各个游戏室 |
| **游戏层级** | GameTier | `core/hierarchy/GameTier.js` | 游戏室管理、等级分准入控制 |
| **游戏层级** | GameTable | `core/hierarchy/GameTable.js` | 游戏桌基类、对局状态管理 |
| **游戏加载** | GameLoader | `core/game/GameLoader.js` | 动态加载游戏、统一管理 |

---

## 模块依赖关系图

```
index.js (主入口)
    │
    ├─→ SocketServer (Socket 服务)
    │       │
    │       └─→ GameLoader (游戏加载器)
    │               │
    │               ├─→ MatchMaker (匹配器)
    │               │
    │               └─→ GameManager (游戏管理器)
    │                       │
    │                       ├─→ GameTier (游戏室)
    │                       │       │
    │                       │       └─→ GameTable (游戏桌)
    │                       │
    │                       └─→ MatchMaker (共享)
    │
    └─→ HttpService (HTTP API)
            │
            └─→ GameLoader (共享)
```

---

## 1. 网络通信模块

### SocketServer.js
```javascript
/**
 * Socket 通信服务
 * 
 * 职责：
 * - 初始化 Socket.IO 服务器
 * - 处理客户端连接和断开
 * - 用户鉴权（JWT Token 验证）
 * - 将游戏相关事件分发到对应的游戏管理器
 * 
 * 关键事件：
 * - connection: 新客户端连接
 * - start_game: 玩家开始游戏
 * - disconnect: 客户端断开连接
 */
```

### HttpService.js
```javascript
/**
 * HTTP API 服务
 * 
 * 职责：
 * - 提供 HTTP 接口作为 Socket.IO 的备用方案
 * - 处理游戏房间列表查询
 * - 提供游戏状态查询
 * 
 * 接口列表：
 * - GET /api/games/:gameId/rooms?tier=xxx - 获取房间列表
 * - GET /api/games - 获取所有游戏列表
 */
```

---

## 2. 匹配系统模块

### MatchMaker.js
```javascript
/**
 * 匹配器
 * 
 * 职责：
 * - 管理所有游戏的匹配队列
 * - 定时执行匹配算法（每 3 秒）
 * - 根据玩家设置寻找合适的对手
 * - 触发匹配成功回调
 * 
 * 数据结构：
 * queues: Map<gameType, Array<PlayerRequest>>
 * 
 * 匹配流程：
 * 1. 玩家加入队列 (joinQueue)
 * 2. 定时器检查队列 (processQueues)
 * 3. 执行匹配算法 (matchGame)
 * 4. 触发回调通知 GameManager
 */
```

---

## 3. 游戏层级模块

### GameManager.js (游戏管理器基类)
```javascript
/**
 * 游戏管理器基类
 * 
 * 职责：
 * - 管理一个游戏类型的所有资源
 * - 初始化和管理游戏室（按等级分类）
 * - 处理玩家进入游戏的各种请求
 * - 协调匹配系统和游戏桌
 * - 设置游戏桌相关的 Socket 监听
 * 
 * 数据结构：
 * tiers: Map<tierId, GameTier>
 * 
 * 核心流程：
 * 1. 玩家进入游戏 (onPlayerJoin)
 * 2. 获取房间列表 (handleGetRooms)
 * 3. 加入游戏桌 (handleJoinTable)
 * 4. 自动匹配 (handleAutoMatch)
 * 5. 匹配成功 (handleMatchFound)
 * 
 * 子类需要：
 * - 继承此类
 * - 可选重写 initTiers() 自定义游戏室
 * - 可选添加游戏特有的事件监听
 */
```

### GameTier.js (游戏室类)
```javascript
/**
 * 游戏室
 * 
 * 职责：
 * - 管理特定等级的游戏桌集合
 * - 维护准入规则（等级分限制）
 * - 提供游戏桌的查询和创建
 * 
 * 属性：
 * - id: 游戏室 ID (如 'beginner')
 * - name: 显示名称 (如 '初级室')
 * - minRating: 最低等级分要求
 * - maxRating: 最高等级分要求
 * - tables: 游戏桌列表
 * 
 * 典型游戏室配置：
 * - free: 免豆室 (0 ~ ∞)
 * - beginner: 初级室 (0 ~ 1500)
 * - intermediate: 中级室 (1500 ~ 1800)
 * - advanced: 高级室 (1800 ~ ∞)
 */
```

### GameTable.js (游戏桌基类)
```javascript
/**
 * 游戏桌基类
 * 
 * 职责：
 * - 管理单个游戏对局的完整生命周期
 * - 处理玩家入座、准备、离开
 * - 管理游戏状态转换 (idle → playing → finished)
 * - 处理游戏内通信（广播、单发）
 * - 执行游戏结算
 * 
 * 状态机：
 * idle (空闲) → playing (游戏中) → finished (已结束) → idle
 * 
 * 玩家状态：
 * - players: 已入座的玩家列表
 * - spectators: 旁观者列表
 * - ready: 玩家准备状态
 * 
 * 钩子方法（子类必须实现）：
 * - onGameStart(): 游戏开始时的初始化
 * - onGameEnd(result): 游戏结束时的清理
 * - onPlayerDisconnectDuringGame(userId): 游戏中断线处理
 * 
 * 子类需要：
 * - 继承此类
 * - 实现钩子方法
 * - 添加游戏特有的方法（如 handleMove）
 */
```

---

## 4. 游戏加载模块

### GameLoader.js
```javascript
/**
 * 游戏加载器
 * 
 * 职责：
 * - 扫描 games/ 目录下的所有游戏
 * - 动态加载游戏管理器
 * - 实例化游戏管理器并注入依赖
 * - 统一管理匹配系统
 * 
 * 加载规则：
 * - 查找 <GameName>Manager.js 或 index.js
 * - 自动实例化并传入 io 和 matchMaker
 * 
 * 数据结构：
 * managers: Map<gameType, GameManager>
 */
```

---

## 具体游戏实现

### ChineseChessManager.js
```javascript
/**
 * 中国象棋游戏管理器
 * 
 * 继承自：GameManager
 * 
 * 职责：
 * - 初始化象棋的游戏室
 * - 处理象棋特有的事件（悔棋、求和等）
 * 
 * 游戏室配置：
 * - free: 免豆室
 * - beginner: 初级室 (0-1500)
 * - intermediate: 中级室 (1500-1800)
 * - advanced: 高级室 (1800+)
 */
```

### ChineseChessRoom.js
```javascript
/**
 * 中国象棋游戏桌
 * 
 * 继承自：GameTable
 * 
 * 职责：
 * - 实现象棋的游戏逻辑
 * - 管理棋盘状态
 * - 处理棋子移动
 * - 判断胜负条件
 * - 处理断线判负
 * 
 * 游戏状态：
 * - board: 10x9 棋盘数组
 * - turn: 当前回合 ('r' 或 'b')
 * - history: 移动历史
 * 
 * 特殊逻辑：
 * - 使用 XiangqiRules 验证移动合法性
 * - 吃掉将/帅时判定胜负
 * - 断线时判对手获胜
 */
```

---

## 事件流程图

### 手动加入游戏桌流程

```
客户端                    SocketServer              GameManager              GameTier                GameTable
  │                           │                         │                       │                       │
  │─── start_game ──────────→│                         │                       │                       │
  │                           │── onPlayerJoin ───────→│                       │                       │
  │                           │                         │                       │                       │
  │─── get_rooms ───────────→│                         │                       │                       │
  │                           │── handleGetRooms ─────→│                       │                       │
  │                           │                         │── getTableList ─────→│                       │
  │                           │                         │←──────────────────────│                       │
  │←── room_list ────────────│                         │                       │                       │
  │                           │                         │                       │                       │
  │─── xxx_join ────────────→│                         │                       │                       │
  │                           │── handleJoinTable ────→│                       │                       │
  │                           │                         │── findTable ────────→│                       │
  │                           │                         │←──────────────────────│                       │
  │                           │                         │── join ─────────────────────────────────────→│
  │                           │                         │                       │                       │
  │←── player_joined ────────│                         │                       │                       │
```

### 自动匹配流程

```
客户端                    GameManager              MatchMaker              GameTier                GameTable
  │                           │                         │                       │                       │
  │─── auto_match ──────────→│                         │                       │                       │
  │                           │── joinQueue ──────────→│                       │                       │
  │←── match_queue_joined ───│                         │                       │                       │
  │                           │                         │                       │                       │
  │                           │                         │ (定时检查)             │                       │
  │                           │                         │── matchGame ────────→│                       │
  │                           │                         │                       │                       │
  │                           │←── handleMatchFound ───│                       │                       │
  │                           │── findAvailableTable ─→│                       │                       │
  │                           │←────────────────────────│                       │                       │
  │                           │── join ─────────────────────────────────────────→│                       │
  │←── match_found ──────────│                         │                       │                       │
  │                           │                         │                       │                       │
  │                           │── playerReady ──────────────────────────────────→│                       │
  │                           │                         │                       │── checkStart ───────→│
  │                           │                         │                       │                       │
  │←── game_start ───────────│                         │                       │                       │
```

---

## Socket 事件列表

### 通用事件（所有游戏）

| 事件名 | 方向 | 数据 | 说明 |
|-------|------|------|------|
| `start_game` | C→S | `gameType` | 玩家开始游戏 |
| `get_rooms` | C→S | `{ tier }` | 获取房间列表 |
| `room_list` | S→C | `Array<RoomInfo>` | 房间列表 |
| `auto_match` | C→S | `matchSettings` | 请求自动匹配 |
| `match_queue_joined` | S→C | `{ message }` | 已加入匹配队列 |
| `match_found` | S→C | `{ roomId, message }` | 匹配成功 |
| `cancel_match` | C→S | - | 取消匹配 |
| `match_cancelled` | S→C | - | 匹配已取消 |
| `player_ready` | C→S | - | 玩家准备 |
| `player_joined` | S→C | `{ player }` | 玩家加入 |
| `player_left` | S→C | `{ userId }` | 玩家离开 |
| `game_start` | S→C | `gameData` | 游戏开始 |
| `game_over` | S→C | `result` | 游戏结束 |
| `error` | S→C | `{ message }` | 错误消息 |

### 游戏特定事件（以象棋为例）

| 事件名 | 方向 | 数据 | 说明 |
|-------|------|------|------|
| `chinesechess_join` | C→S | `{ tier, roomId }` | 加入象棋桌 |
| `chinesechess_leave` | C→S | - | 离开象棋桌 |
| `chinesechess_move` | C→S | `{ fromX, fromY, toX, toY }` | 移动棋子 |
| `move` | S→C | `{ move, turn, board }` | 移动广播 |

---

## 数据模型

### PlayerInfo (玩家信息)
```javascript
{
    userId: String,        // 用户 ID
    socketId: String,      // Socket ID
    nickname: String,      // 昵称
    avatar: String,        // 头像 URL
    ready: Boolean,        // 是否准备
    rating: Number,        // 等级分
    title: String          // 称号
}
```

### RoomInfo (房间信息)
```javascript
{
    id: String,            // 房间 ID
    status: String,        // 状态 (idle/playing/finished)
    players: Number,       // 当前玩家数
    spectators: Number,    // 旁观者数
    maxPlayers: Number     // 最大玩家数
}
```

### MatchSettings (匹配设置)
```javascript
{
    baseBet: Number,       // 底豆
    betRange: [min, max],  // 接受的底豆范围
    // 其他游戏特定设置...
}
```

---

## 总结

新架构的核心优势：

1. **职责清晰**：每个模块只负责一件事
2. **易于扩展**：添加新游戏只需继承基类
3. **代码复用**：通用逻辑在基类中实现
4. **易于测试**：模块间依赖注入，方便 mock
5. **统一管理**：匹配系统、游戏加载统一处理

所有模块都有详细的中文注释，方便理解和维护。
