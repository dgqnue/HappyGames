# 🎮 游戏匹配流程模板

## 📋 目录
1. [概述](#概述)
2. [架构设计](#架构设计)
3. [服务端模板](#服务端模板)
4. [客户端模板](#客户端模板)
5. [完整流程](#完整流程)
6. [中国象棋实现示例](#中国象棋实现示例)
7. [最佳实践](#最佳实践)

---

## 概述

本文档定义了 HappyGames 平台的标准游戏匹配流程模板。所有新游戏应遵循此模板实现匹配系统，以确保一致的用户体验和代码可维护性。

### 核心特性

- ✅ **房间列表展示**：实时显示可用游戏桌
- ✅ **入座机制**：玩家选择游戏桌入座
- ✅ **准备检查**：满员后进入准备阶段
- ✅ **倒计时**：30秒准备倒计时
- ✅ **自动踢出**：超时未准备的玩家被踢出
- ✅ **状态同步**：实时广播房间状态更新
- ✅ **自由离开**：游戏开始前可随时离开

### 设计原则

1. **状态驱动**：所有 UI 变化由状态驱动
2. **实时同步**：使用 Socket.IO 实时广播状态
3. **用户友好**：在游戏桌卡片上直接操作，无需弹窗
4. **容错性**：处理断线重连、超时等异常情况

---

## 架构设计

### 核心组件

```
服务端：
├── BaseGameManager.js          # 游戏管理器基类
├── MatchableGameRoom.js        # 可匹配游戏房间基类
├── MatchRoomState.js           # 房间状态管理
└── AutoMatchManager.js         # 自动匹配管理器

客户端：
├── GameClientTemplate.ts       # 游戏客户端基类
├── GameRoomList.tsx           # 房间列表组件（模板）
├── GamePlayLayout.tsx         # 游戏界面布局（模板）
└── useRoomList.ts             # 房间列表 Hook
```

### 状态流转

```
waiting (等待中)
    ↓ 满员
ready_check (准备检查)
    ↓ 全部准备
playing (游戏中)
    ↓ 游戏结束
ended (已结束)
    ↓ 再来一局
ready_check
```

### 关键状态

| 状态 | 说明 | 玩家操作 |
|------|------|----------|
| `waiting` | 等待玩家入座 | 可入座、可离开 |
| `ready_check` | 准备检查阶段 | 可准备、可离开 |
| `playing` | 游戏进行中 | 可下棋、可认输 |
| `ended` | 游戏已结束 | 可再来一局、可离开 |

---

## 服务端模板

### 1. 游戏房间类（继承 MatchableGameRoom）

```javascript
// server/src/games/{gamename}/rooms/{GameName}Room.js
const MatchableGameRoom = require('../../../gamecore/MatchableGameRoom');

class ChineseChessRoom extends MatchableGameRoom {
    constructor(io, roomId, tier) {
        // 调用父类构造函数
        // 参数：io, roomId, gameType, maxPlayers, tier
        super(io, roomId, 'chinesechess', 2, tier);
        
        // 游戏特定状态
        this.board = this.initBoard();
        this.currentTurn = 'red';
        this.moveHistory = [];
    }

    /**
     * 初始化游戏（所有玩家准备好后调用）
     * 必须实现此方法
     */
    initGame() {
        console.log(`[ChineseChessRoom] Initializing game for room ${this.roomId}`);
        
        // 重置游戏状态
        this.board = this.initBoard();
        this.currentTurn = 'red';
        this.moveHistory = [];
        
        // 分配玩家方（红方/黑方）
        const players = this.matchState.players;
        if (players.length === 2) {
            players[0].side = 'red';
            players[1].side = 'black';
        }
        
        // 广播游戏开始
        this.broadcastGameState();
    }

    /**
     * 处理游戏操作
     */
    handleMove(socket, data) {
        // 验证玩家身份
        const player = this.matchState.players.find(p => p.socketId === socket.id);
        if (!player) return;
        
        // 验证回合
        if (player.side !== this.currentTurn) {
            socket.emit('error', { message: '不是你的回合' });
            return;
        }
        
        // 执行移动逻辑
        // ...
        
        // 广播状态
        this.broadcastGameState();
    }

    /**
     * 广播游戏状态
     */
    broadcastGameState() {
        const state = {
            roomId: this.roomId,
            status: this.matchState.status,
            board: this.board,
            turn: this.currentTurn,
            players: this.matchState.players.map(p => ({
                userId: p.userId,
                socketId: p.socketId,
                nickname: p.nickname,
                side: p.side,
                ready: p.ready
            })),
            maxPlayers: this.maxPlayers
        };
        
        // 向每个玩家发送个性化状态（包含 mySide）
        this.matchState.players.forEach(player => {
            const socket = this.io.sockets.sockets.get(player.socketId);
            if (socket) {
                socket.emit('state', {
                    ...state,
                    mySide: player.side
                });
            }
        });
    }

    /**
     * 初始化棋盘
     */
    initBoard() {
        // 返回初始棋盘状态
        return [
            ['r', 'n', 'b', 'a', 'k', 'a', 'b', 'n', 'r'],
            // ...
        ];
    }
}

module.exports = ChineseChessRoom;
```

### 2. 游戏管理器类（继承 BaseGameManager）

```javascript
// server/src/games/{gamename}/index.js
const BaseGameManager = require('../../gamecore/BaseGameManager');
const ChineseChessRoom = require('./rooms/ChineseChessRoom');

class ChineseChessManager extends BaseGameManager {
    constructor(io) {
        super(io, 'chinesechess', ChineseChessRoom);
    }

    /**
     * 玩家加入游戏管理器
     * 设置游戏特定的事件监听
     */
    onPlayerJoin(socket, user) {
        // 调用父类方法（设置通用事件）
        super.onPlayerJoin(socket, user);
        
        // 设置游戏特定事件
        socket.on('chinesechess_move', (data) => {
            this.handleMove(socket, data);
        });
        
        socket.on('chinesechess_surrender', () => {
            this.handleSurrender(socket);
        });
    }

    /**
     * 处理移动
     */
    handleMove(socket, data) {
        const { roomId, fromX, fromY, toX, toY } = data;
        
        // 查找房间
        const room = this.findRoomById(roomId);
        if (!room) {
            socket.emit('error', { message: '房间不存在' });
            return;
        }
        
        // 委托给房间处理
        room.handleMove(socket, { fromX, fromY, toX, toY });
    }

    /**
     * 查找房间
     */
    findRoomById(roomId) {
        for (const tier in this.rooms) {
            const room = this.rooms[tier].find(r => r.roomId === roomId);
            if (room) return room;
        }
        return null;
    }
}

module.exports = ChineseChessManager;
```

### 3. 关键点说明

#### MatchableGameRoom 提供的功能

- ✅ `playerJoin(socket, matchSettings)` - 玩家入座
- ✅ `playerLeave(socket)` - 玩家离座
- ✅ `startReadyCheck()` - 开始准备检查
- ✅ `playerReady(socket)` - 玩家准备
- ✅ `broadcastRoomState()` - 广播房间状态
- ✅ 自动处理准备超时、踢出玩家
- ✅ 自动调用 `initGame()` 当所有玩家准备好

#### 必须实现的方法

- ✅ `initGame()` - 初始化游戏（所有玩家准备后调用）
- ✅ 游戏特定的操作处理方法（如 `handleMove`）

#### BaseGameManager 提供的功能

- ✅ 房间初始化和管理
- ✅ 处理 `get_rooms` 请求
- ✅ 处理 `{gameType}_join` 请求
- ✅ 广播房间列表更新
- ✅ 断线重连处理

---

## 客户端模板

### 1. 游戏客户端类（继承 GameClientTemplate）

```typescript
// client/src/components/{GameName}/{GameName}Client.ts
import { GameClientTemplate } from '@/gamecore/GameClientTemplate';

export class ChineseChessClient extends GameClientTemplate {
    constructor(socket: any) {
        super(socket, 'chinesechess');
    }

    /**
     * 发送移动
     */
    sendMove(fromX: number, fromY: number, toX: number, toY: number) {
        this.socket.emit('chinesechess_move', {
            roomId: this.currentRoomId,
            fromX,
            fromY,
            toX,
            toY
        });
    }

    /**
     * 认输
     */
    surrender() {
        this.socket.emit('chinesechess_surrender');
    }
}
```

### 2. 游戏页面组件

```typescript
// client/src/app/game/{gamename}/play/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import io from 'socket.io-client';
import { ChineseChessClient } from '@/components/ChineseChess/ChineseChessClient';
import { useRoomList } from '@/gamecore/useRoomList';
import { GameRoomList } from '@/components/GameTemplates/GameRoomList';
import { GamePlayLayout } from '@/components/GameTemplates/GamePlayLayout';
import ChessBoard from '@/components/ChineseChess/ChessBoard';

export default function ChineseChessPlay() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tier = searchParams.get('tier') || 'free';

    const [status, setStatus] = useState<'connecting' | 'lobby' | 'playing'>('connecting');
    const [gameClient, setGameClient] = useState<ChineseChessClient | null>(null);
    const [gameState, setGameState] = useState<any>(null);
    const [socket, setSocket] = useState<any>(null);
    const [readyTimer, setReadyTimer] = useState<number | null>(null);
    const [isReady, setIsReady] = useState(false);

    // 使用双通道获取房间列表
    const rooms = useRoomList(socket, 'chinesechess', tier, {
        enableHttp: true,
        enableSocket: true,
        pollInterval: 5000
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/');
            return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const newSocket = io(apiUrl, {
            auth: { token },
            transports: ['polling', 'websocket'],
            reconnection: true
        });

        newSocket.on('connect', () => {
            console.log('[Socket] Connected');
            
            // 发送 start_game 事件
            newSocket.emit('start_game', 'chinesechess');
            
            const client = new ChineseChessClient(newSocket);

            client.init((state) => {
                setGameState(state);
                
                // 根据房间状态更新UI
                if (state.status === 'playing') {
                    setStatus('playing');
                    setReadyTimer(null);
                } else if (state.status === 'ended') {
                    setReadyTimer(null);
                }
            });

            // 监听准备检查
            newSocket.on('ready_check_start', (data: any) => {
                setReadyTimer(data.timeout / 1000);
                setIsReady(false);
            });

            // 监听被踢出
            newSocket.on('kicked', (data: any) => {
                alert(`您已被踢出房间: ${data.reason}`);
                setStatus('lobby');
                setReadyTimer(null);
            });

            setGameClient(client);
            setSocket(newSocket);
            setStatus('lobby');
        });

        newSocket.on('connect_error', (err: any) => {
            console.error('Socket error:', err);
            if (err.message.includes('Authentication error')) {
                router.push('/');
            }
        });

        return () => {
            if (gameClient) {
                gameClient.leave();
                gameClient.dispose();
            }
            newSocket.disconnect();
        };
    }, [router]);

    // 倒计时逻辑
    useEffect(() => {
        if (readyTimer === null || readyTimer <= 0) return;
        
        const timer = setInterval(() => {
            setReadyTimer(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
        }, 1000);
        
        return () => clearInterval(timer);
    }, [readyTimer]);

    const handleJoinRoom = (roomId: string) => {
        if (!gameClient) return;
        gameClient.joinRoom(tier, roomId);
    };

    const handleLeave = () => {
        if (gameClient) {
            gameClient.leave();
        }
        setStatus('lobby');
        setReadyTimer(null);
    };

    const handleReady = () => {
        if (gameClient) {
            gameClient.playerReady();
            setIsReady(true);
        }
    };

    const handleMove = (fromX: number, fromY: number, toX: number, toY: number) => {
        if (gameClient) {
            gameClient.sendMove(fromX, fromY, toX, toY);
        }
    };

    // 计算是否在房间中
    const amIInRoom = gameState?.players?.some((p: any) => p.socketId === socket?.id);
    const currentRoomId = amIInRoom ? gameState.roomId : null;

    if (status === 'connecting') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-2xl font-bold animate-pulse">连接服务器中...</div>
            </div>
        );
    }

    if (status === 'lobby') {
        return (
            <GameRoomList
                gameName="中国象棋"
                tier={tier}
                rooms={rooms}
                onJoinRoom={handleJoinRoom}
                onQuickStart={() => {/* 实现快速开始 */}}
                onLeave={() => router.push('/game/chinesechess')}
                currentRoomId={currentRoomId}
                isReady={isReady}
                readyTimer={readyTimer}
                onReady={handleReady}
                onLeaveRoom={() => {
                    handleLeave();
                    setGameState(null);
                }}
            />
        );
    }

    return (
        <GamePlayLayout
            gameName="中国象棋"
            gameState={gameState}
            onLeave={handleLeave}
            onRestart={() => {/* 实现再来一局 */}}
        >
            <ChessBoard
                board={gameState?.board || []}
                turn={gameState?.turn || 'red'}
                mySide={gameState?.mySide}
                onMove={handleMove}
            />
        </GamePlayLayout>
    );
}
```

### 3. 关键点说明

#### GameClientTemplate 提供的功能

- ✅ `init(callback)` - 初始化并监听状态更新
- ✅ `joinRoom(tier, roomId)` - 加入房间
- ✅ `leave()` - 离开房间
- ✅ `playerReady()` - 玩家准备
- ✅ `dispose()` - 清理资源

#### GameRoomList 组件 Props

```typescript
interface GameRoomListProps {
    gameName: string;              // 游戏名称
    tier: string;                  // 房间等级
    rooms: Room[];                 // 房间列表
    onJoinRoom: (roomId: string) => void;  // 入座回调
    onQuickStart: () => void;      // 快速开始回调
    onLeave: () => void;           // 返回游戏中心回调
    currentRoomId?: string | null; // 当前所在房间ID
    isReady?: boolean;             // 是否已准备
    readyTimer?: number | null;    // 准备倒计时
    onReady?: () => void;          // 准备回调
    onLeaveRoom?: () => void;      // 离开房间回调
}
```

#### GamePlayLayout 组件 Props

```typescript
interface GamePlayLayoutProps {
    gameName: string;              // 游戏名称
    gameState: any;                // 游戏状态
    onLeave: () => void;           // 离开回调
    onRestart?: () => void;        // 再来一局回调
    children: React.ReactNode;     // 游戏界面（棋盘等）
}
```

---

## 完整流程

### 1. 玩家入座流程

```
客户端                          服务端
   |                              |
   |-- emit('chinesechess_join')-->|
   |                              |-- room.playerJoin()
   |                              |-- matchState.addPlayer()
   |                              |-- broadcastRoomState()
   |<-- emit('state') ------------|
   |                              |
   |-- 更新 UI（显示"开始"按钮）  |
```

### 2. 准备检查流程

```
客户端                          服务端
   |                              |
   |                              |-- 满员检测
   |                              |-- room.startReadyCheck()
   |                              |-- matchState.status = 'ready_check'
   |<-- emit('ready_check_start')-|
   |                              |-- setTimeout(30s)
   |-- 显示倒计时                 |
   |                              |
   |-- 点击"开始"                 |
   |-- emit('player_ready') ----->|
   |                              |-- matchState.setPlayerReady()
   |<-- emit('state') ------------|
   |-- 按钮变为"就绪"             |
```

### 3. 游戏开始流程

```
客户端                          服务端
   |                              |
   |                              |-- 检测所有玩家就绪
   |                              |-- matchState.status = 'playing'
   |                              |-- room.initGame()
   |                              |-- 分配玩家方（红/黑）
   |<-- emit('state') ------------|
   |                              |
   |-- setStatus('playing')       |
   |-- 渲染游戏界面               |
```

### 4. 玩家离开流程

```
客户端                          服务端
   |                              |
   |-- 点击"离开"                 |
   |-- emit('chinesechess_leave')->|
   |                              |-- room.playerLeave()
   |                              |-- matchState.removePlayer()
   |                              |-- matchState.status = 'waiting'
   |                              |-- broadcastRoomState()
   |                              |-- gameManager.broadcastRoomList()
   |<-- emit('state') ------------|
   |<-- emit('room_list') --------|
   |                              |
   |-- 返回大厅                   |
   |-- 房间列表更新               |
```

---

## 中国象棋实现示例

中国象棋完全遵循此模板实现，是标准的参考实现。

### 文件结构

```
server/src/games/chinesechess/
├── index.js                    # ChineseChessManager
└── rooms/
    └── ChineseChessRoom.js     # ChineseChessRoom

client/src/
├── app/game/chinesechess/play/
│   └── page.tsx                # 游戏页面
└── components/ChineseChess/
    ├── ChineseChessClient.ts   # 客户端类
    └── ChessBoard.tsx          # 棋盘组件
```

### 关键实现

1. **ChineseChessRoom** 继承 `MatchableGameRoom`
   - 实现 `initGame()` 初始化棋盘
   - 实现 `handleMove()` 处理移动
   - 实现 `broadcastGameState()` 广播状态

2. **ChineseChessManager** 继承 `BaseGameManager`
   - 设置游戏特定事件监听
   - 委托操作给对应的房间

3. **ChineseChessClient** 继承 `GameClientTemplate`
   - 实现 `sendMove()` 发送移动
   - 实现 `surrender()` 认输

4. **页面组件** 使用模板组件
   - 使用 `GameRoomList` 显示房间列表
   - 使用 `GamePlayLayout` 布局游戏界面
   - 使用 `useRoomList` Hook 获取房间列表

---

## 最佳实践

### 1. 状态管理

- ✅ 所有状态由服务端管理，客户端只负责展示
- ✅ 使用 `matchState.status` 控制流程
- ✅ 不要在客户端维护游戏逻辑状态

### 2. 事件命名

- ✅ 使用 `{gameType}_` 前缀命名游戏特定事件
- ✅ 例如：`chinesechess_move`, `chinesechess_surrender`
- ✅ 通用事件使用模板提供的名称（`state`, `room_list` 等）

### 3. 错误处理

- ✅ 验证玩家身份和权限
- ✅ 验证游戏逻辑（回合、合法性等）
- ✅ 向客户端发送清晰的错误消息

### 4. 性能优化

- ✅ 使用 `broadcastRoomState()` 而不是手动广播
- ✅ 只向房间内的玩家发送详细状态
- ✅ 向大厅发送轻量级的房间列表

### 5. 用户体验

- ✅ 在游戏桌卡片上直接操作（不使用弹窗）
- ✅ 显示清晰的倒计时和状态提示
- ✅ 允许玩家在游戏开始前自由离开
- ✅ 处理断线重连

### 6. 代码组织

- ✅ 游戏逻辑放在 `{GameName}Room` 中
- ✅ 事件路由放在 `{GameName}Manager` 中
- ✅ UI 组件使用模板组件
- ✅ 复用 `GameClientTemplate` 和 `useRoomList`

---

## 常见问题

### Q: 为什么房间状态卡在 ready_check？

A: 确保 `MatchRoomState.addPlayer()` 中**不要**调用 `startReadyCheck()`。这应该由 `MatchableGameRoom` 控制，因为它需要设置定时器和广播。

### Q: 为什么玩家离开后房间列表没有更新？

A: 确保：
1. `MatchableGameRoom` 有 `gameManager` 引用
2. `broadcastRoomState()` 调用了 `gameManager.broadcastRoomList()`
3. 客户端加入了 `{gameType}_{tier}` 广播房间

### Q: 如何实现自动匹配？

A: 使用 `AutoMatchManager`，参考 `MATCH_SYSTEM_GUIDE.md`。

### Q: 如何实现观战功能？

A: 使用 `matchState.addSpectator()`，向观众发送公共信息（不包含私密数据）。

---

## 更新日志

### 2025-11-28
- ✅ 创建游戏匹配流程模板文档
- ✅ 定义服务端和客户端模板
- ✅ 添加中国象棋实现示例
- ✅ 修复房间状态卡在 ready_check 的问题
- ✅ 修改按钮文案（"准备" -> "开始"，"已准备" -> "就绪"）
- ✅ 实现在游戏桌卡片上直接操作（移除弹窗）

---

## 相关文档

- [游戏模板指南](./GAME_TEMPLATE_GUIDE.md)
- [匹配系统指南](./MATCH_SYSTEM_GUIDE.md)
- [UI 模板指南](./UI_TEMPLATE_GUIDE.md)
- [开发文档](./development_docs.md)
