# 🎮 HappyGames 游戏开发模板指南

## 📋 目录
1. [概述](#概述)
2. [快速开始](#快速开始)
3. [服务端模板](#服务端模板)
4. [客户端模板](#客户端模板)
5. [完整示例](#完整示例)
6. [最佳实践](#最佳实践)

---

## 概述

本指南提供了一套标准化的游戏开发模板，基于中国象棋的成功实现。所有新游戏都应遵循此架构，以确保：

- ✅ **代码复用**：减少重复代码，提高开发效率
- ✅ **架构统一**：所有游戏使用相同的通信模式和状态管理
- ✅ **高可用性**：内置 Socket.IO + HTTP 双通道冗余机制
- ✅ **易于维护**：清晰的目录结构和命名规范

---

## 快速开始

### 创建新游戏的步骤

假设我们要创建一个名为 `gomoku`（五子棋）的新游戏：

```bash
# 1. 服务端：复制模板
cp -r server/src/games/_template server/src/games/gomoku

# 2. 客户端：复制模板
cp -r client/src/components/_GameTemplate client/src/components/Gomoku
cp -r client/src/app/game/_template client/src/app/game/gomoku

# 3. 修改文件中的占位符
# 将所有 {GAME_NAME} 替换为 gomoku
# 将所有 {GameName} 替换为 Gomoku
# 将所有 {游戏名称} 替换为 五子棋
```

---

## 服务端模板

### 目录结构

```
server/src/games/{GAME_NAME}/
├── index.js                    # 游戏管理器 (GameManager)
├── logic/
│   └── {GameName}Rules.js     # 游戏规则引擎
└── rooms/
    └── {GameName}Room.js      # 游戏房间逻辑
```

### 1. 游戏管理器模板 (`index.js`)

```javascript
// server/src/games/{GAME_NAME}/index.js
const {GameName}Room = require('./rooms/{GameName}Room');
const UserGameStats = require('../../models/UserGameStats');

class {GameName}Manager {
    constructor(io) {
        this.io = io;
        this.gameType = '{GAME_NAME}';
        this.rooms = {
            free: [],
            beginner: [],
            intermediate: [],
            advanced: []
        };
        this.initRooms();
    }

    initRooms() {
        const tiers = ['free', 'beginner', 'intermediate', 'advanced'];
        console.log('[{GameName}] Initializing rooms...');
        tiers.forEach(tier => {
            for (let i = 0; i < 3; i++) {
                const roomId = `${this.gameType}_${tier}_${i}`;
                const room = new {GameName}Room(roomId, this.io, tier);
                this.rooms[tier].push(room);
                console.log(`[{GameName}] Created room: ${roomId}`);
            }
        });
        console.log(`[{GameName}] Total rooms created: ${Object.values(this.rooms).flat().length}`);
    }

    // 玩家加入游戏
    onPlayerJoin(socket, user) {
        console.log(`Player ${user.username} joined {GameName} manager`);

        // 监听获取房间列表请求
        socket.on('get_rooms', ({ tier }) => {
            console.log(`Player ${user.username} requested rooms for tier: ${tier}`);
            if (this.rooms[tier]) {
                const roomList = this.getRoomList(tier);
                console.log(`Sending ${roomList.length} rooms to player`);
                socket.emit('room_list', roomList);
            } else {
                console.error(`Invalid tier requested: ${tier}`);
                socket.emit('room_list', []);
            }
        });

        // 监听加入房间请求
        socket.on('{GAME_NAME}_join', (data) => this.handleJoin(socket, data));
    }

    async handleJoin(socket, data) {
        const { tier, roomId } = data;

        // 获取用户等级分
        const stats = await UserGameStats.findOne({
            userId: socket.user._id,
            gameType: this.gameType
        });
        const rating = stats ? stats.rating : 1200;

        // 验证等级分权限
        if (!this.canAccessTier(tier, rating)) {
            socket.emit('error', {
                code: 'TIER_RESTRICTED',
                message: 'Your rating does not allow access to this tier.'
            });
            return;
        }

        let room;
        if (roomId) {
            // 加入指定房间
            room = this.rooms[tier].find(r => r.roomId === roomId);
        } else {
            // 自动匹配
            room = this.rooms[tier].find(r => r.status === 'waiting' && r.canJoin());
        }

        if (!room) {
            if (roomId) {
                return socket.emit('error', { message: 'Room not found' });
            }
            // 创建新房间
            const newRoomId = `${this.gameType}_${tier}_${this.rooms[tier].length}`;
            room = new {GameName}Room(newRoomId, this.io, tier);
            this.rooms[tier].push(room);
        }

        // 设置事件监听
        socket.on('{GAME_NAME}_move', (move) => room.handleMove(socket, move));

        // 断线处理
        socket.removeAllListeners('disconnect');
        socket.on('disconnect', () => this.handleDisconnect(socket, room));

        // 加入房间
        await room.join(socket);
    }

    canAccessTier(tier, rating) {
        switch (tier) {
            case 'free':
                return true;
            case 'beginner':
                return rating < 1500;
            case 'intermediate':
                return rating >= 1500 && rating <= 1800;
            case 'advanced':
                return rating > 1800;
            default:
                return false;
        }
    }

    handleDisconnect(socket, room) {
        // 处理玩家断线
        if (room) {
            room.handlePlayerDisconnect(socket);
        }
    }

    getRoomList(tier) {
        console.log(`[{GameName}] getRoomList called for tier: ${tier}`);
        const roomList = this.rooms[tier].map(room => ({
            id: room.roomId,
            status: room.status,
            players: room.getPlayerCount(),
            spectators: room.spectators.length
        }));
        console.log(`[{GameName}] Returning room list:`, JSON.stringify(roomList));
        return roomList;
    }
}

module.exports = {GameName}Manager;
```

### 2. 游戏房间模板 (`rooms/{GameName}Room.js`)

```javascript
// server/src/games/{GAME_NAME}/rooms/{GameName}Room.js
const BaseGameRoom = require('../../../gamecore/BaseGameRoom');
const {GameName}Rules = require('../logic/{GameName}Rules');
const EloService = require('../../../gamecore/EloService');

class {GameName}Room extends BaseGameRoom {
    constructor(roomId, io, tier) {
        super(io, roomId);
        this.tier = tier;
        this.gameType = '{GAME_NAME}';
        this.resetGame();
    }

    resetGame() {
        // 初始化游戏状态
        this.board = this.initializeBoard();
        this.turn = 'player1'; // 或其他初始玩家
        this.status = 'waiting'; // waiting, playing, ended
        this.players = {}; // 玩家映射
        this.spectators = [];
        this.history = [];
    }

    initializeBoard() {
        // TODO: 根据具体游戏初始化棋盘/游戏状态
        // 示例：五子棋 15x15 棋盘
        return Array(15).fill(null).map(() => Array(15).fill(null));
    }

    async join(socket) {
        const userId = socket.user._id;

        // 检查玩家是否已在房间
        if (this.isPlayerInRoom(userId)) {
            return this.sendState(socket);
        }

        // 尝试分配玩家位置
        if (this.canJoin()) {
            this.addPlayer(socket);
        } else {
            // 作为观众加入
            this.spectators.push(userId);
        }

        socket.join(this.roomId);
        this.broadcastState();

        // 检查是否可以开始游戏
        if (this.isReadyToStart()) {
            this.startGame();
        }
    }

    canJoin() {
        // TODO: 根据游戏类型判断是否可加入
        // 示例：双人游戏
        return Object.keys(this.players).length < 2;
    }

    getPlayerCount() {
        return Object.keys(this.players).length;
    }

    isPlayerInRoom(userId) {
        return Object.values(this.players).includes(userId);
    }

    addPlayer(socket) {
        // TODO: 根据游戏类型分配玩家位置
        // 示例：双人游戏
        if (!this.players.player1) {
            this.players.player1 = socket.user._id;
        } else if (!this.players.player2) {
            this.players.player2 = socket.user._id;
        }
    }

    isReadyToStart() {
        // TODO: 根据游戏类型判断是否可以开始
        // 示例：双人游戏需要两个玩家
        return this.getPlayerCount() === 2 && this.status === 'waiting';
    }

    startGame() {
        this.status = 'playing';
        this.broadcast('game_start', {
            players: this.players,
            turn: this.turn
        });
    }

    handleMove(socket, move) {
        if (this.status !== 'playing') return;

        const userId = socket.user._id;

        // 验证回合
        if (!this.isPlayerTurn(userId)) {
            return socket.emit('error', { message: 'Not your turn' });
        }

        // 验证移动合法性
        if (!{GameName}Rules.isValidMove(this.board, move, this.turn)) {
            return socket.emit('error', { message: 'Invalid move' });
        }

        // 执行移动
        this.executeMove(move);
        this.history.push(move);

        // 检查游戏结束
        const winner = {GameName}Rules.checkWinner(this.board, move);
        if (winner) {
            this.endGame(winner);
            return;
        }

        // 切换回合
        this.switchTurn();

        // 广播游戏状态
        this.broadcast('move', {
            move,
            turn: this.turn,
            board: this.board
        });
    }

    isPlayerTurn(userId) {
        // TODO: 根据游戏逻辑判断
        return this.players[this.turn] === userId;
    }

    executeMove(move) {
        // TODO: 根据游戏规则执行移动
        const { x, y } = move;
        this.board[y][x] = this.turn;
    }

    switchTurn() {
        // TODO: 根据游戏类型切换回合
        this.turn = this.turn === 'player1' ? 'player2' : 'player1';
    }

    async endGame(winner) {
        this.status = 'ended';
        const winnerId = this.players[winner];
        const loserId = Object.values(this.players).find(id => id !== winnerId);

        // ELO 结算
        const eloResult = await EloService.processMatchResult(
            this.gameType,
            winnerId,
            loserId,
            1
        );

        // 游戏豆结算（非免费房间）
        if (this.tier !== 'free') {
            const betAmount = this.getBetAmount();
            await this.settle({
                winner: winnerId,
                loser: loserId,
                amount: betAmount
            });
        }

        this.broadcast('game_over', {
            winner,
            elo: eloResult
        });

        // 延迟重置
        setTimeout(() => this.resetGame(), 5000);
    }

    getBetAmount() {
        switch (this.tier) {
            case 'beginner': return 100;
            case 'intermediate': return 1000;
            case 'advanced': return 10000;
            default: return 0;
        }
    }

    handlePlayerDisconnect(socket) {
        const userId = socket.user._id;
        
        // 如果是玩家断线，判负
        const playerKey = Object.keys(this.players).find(key => this.players[key] === userId);
        if (playerKey && this.status === 'playing') {
            const winner = playerKey === 'player1' ? 'player2' : 'player1';
            this.endGame(winner);
        }
    }

    broadcastState() {
        this.broadcast('state', {
            board: this.board,
            turn: this.turn,
            status: this.status,
            players: this.players
        });
    }

    sendState(socket) {
        socket.emit('state', {
            board: this.board,
            turn: this.turn,
            status: this.status,
            players: this.players
        });
    }
}

module.exports = {GameName}Room;
```

### 3. 游戏规则模板 (`logic/{GameName}Rules.js`)

```javascript
// server/src/games/{GAME_NAME}/logic/{GameName}Rules.js

class {GameName}Rules {
    /**
     * 验证移动是否合法
     * @param {Array} board - 游戏棋盘状态
     * @param {Object} move - 移动信息
     * @param {String} player - 当前玩家
     * @returns {Boolean}
     */
    static isValidMove(board, move, player) {
        // TODO: 实现具体游戏规则
        const { x, y } = move;
        
        // 基本验证：位置是否在棋盘内
        if (x < 0 || x >= board[0].length || y < 0 || y >= board.length) {
            return false;
        }

        // 基本验证：位置是否为空
        if (board[y][x] !== null) {
            return false;
        }

        return true;
    }

    /**
     * 检查是否有玩家获胜
     * @param {Array} board - 游戏棋盘状态
     * @param {Object} lastMove - 最后一步移动
     * @returns {String|null} - 获胜玩家或 null
     */
    static checkWinner(board, lastMove) {
        // TODO: 实现胜利条件检查
        // 示例：五子棋检查五连
        const { x, y } = lastMove;
        const player = board[y][x];

        // 检查四个方向
        const directions = [
            [1, 0],   // 横向
            [0, 1],   // 纵向
            [1, 1],   // 斜向 \
            [1, -1]   // 斜向 /
        ];

        for (const [dx, dy] of directions) {
            if (this.checkLine(board, x, y, dx, dy, player, 5)) {
                return player;
            }
        }

        return null;
    }

    /**
     * 检查指定方向是否有连续的棋子
     */
    static checkLine(board, x, y, dx, dy, player, count) {
        let total = 1; // 包含当前位置

        // 正向检查
        for (let i = 1; i < count; i++) {
            const nx = x + dx * i;
            const ny = y + dy * i;
            if (this.isInBounds(board, nx, ny) && board[ny][nx] === player) {
                total++;
            } else {
                break;
            }
        }

        // 反向检查
        for (let i = 1; i < count; i++) {
            const nx = x - dx * i;
            const ny = y - dy * i;
            if (this.isInBounds(board, nx, ny) && board[ny][nx] === player) {
                total++;
            } else {
                break;
            }
        }

        return total >= count;
    }

    static isInBounds(board, x, y) {
        return x >= 0 && x < board[0].length && y >= 0 && y < board.length;
    }
}

module.exports = {GameName}Rules;
```

---

## 客户端模板

### 目录结构

```
client/src/
├── components/{GameName}/
│   ├── {GameName}Client.ts    # 游戏客户端逻辑
│   └── {GameName}Board.tsx    # 游戏界面组件
└── app/game/{GAME_NAME}/
    ├── page.tsx               # 游戏中心（房间选择）
    └── play/
        └── page.tsx           # 游戏对局页面
```

### 1. 游戏客户端模板 (`{GameName}Client.ts`)

```typescript
// client/src/components/{GameName}/{GameName}Client.ts
import { Socket } from 'socket.io-client';

export class {GameName}Client {
    private socket: Socket;
    private onStateUpdate: (state: any) => void;

    constructor(socket: Socket) {
        this.socket = socket;
        this.onStateUpdate = () => {};
    }

    init(onStateUpdate: (state: any) => void) {
        this.onStateUpdate = onStateUpdate;

        // 监听游戏状态更新
        this.socket.on('state', (state) => {
            console.log('[{GameName}] State update:', state);
            this.handleStateUpdate(state);
        });

        // 监听游戏开始
        this.socket.on('game_start', (data) => {
            console.log('[{GameName}] Game started:', data);
            this.handleStateUpdate({ ...data, status: 'playing' });
        });

        // 监听移动
        this.socket.on('move', (data) => {
            console.log('[{GameName}] Move received:', data);
            this.handleStateUpdate(data);
        });

        // 监听游戏结束
        this.socket.on('game_over', (data) => {
            console.log('[{GameName}] Game over:', data);
            this.handleStateUpdate({ ...data, status: 'ended' });
        });

        // 监听错误
        this.socket.on('error', (error) => {
            console.error('[{GameName}] Error:', error);
            alert(error.message || 'An error occurred');
        });
    }

    private handleStateUpdate(state: any) {
        this.onStateUpdate(state);
    }

    joinTier(tier: string) {
        console.log('[{GameName}] Joining tier:', tier);
        this.socket.emit('{GAME_NAME}_join', { tier });
    }

    joinRoom(tier: string, roomId: string) {
        console.log('[{GameName}] Joining room:', roomId);
        this.socket.emit('{GAME_NAME}_join', { tier, roomId });
    }

    makeMove(move: any) {
        console.log('[{GameName}] Making move:', move);
        this.socket.emit('{GAME_NAME}_move', move);
    }

    dispose() {
        this.socket.off('state');
        this.socket.off('game_start');
        this.socket.off('move');
        this.socket.off('game_over');
        this.socket.off('error');
    }
}
```

### 2. 游戏对局页面模板 (`play/page.tsx`)

```typescript
// client/src/app/game/{GAME_NAME}/play/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import io from 'socket.io-client';
import {GameName}Board from '@/components/{GameName}/{GameName}Board';
import { {GameName}Client } from '@/components/{GameName}/{GameName}Client';

export default function {GameName}Play() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tier = searchParams.get('tier') || 'free';

    const [status, setStatus] = useState<'connecting' | 'lobby' | 'matching' | 'playing'>('connecting');
    const [gameClient, setGameClient] = useState<{GameName}Client | null>(null);
    const [gameState, setGameState] = useState<any>(null);
    const [socket, setSocket] = useState<any>(null);
    const [rooms, setRooms] = useState<any[]>([]);

    // Socket 连接初始化
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/');
            return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        console.log('Connecting to game server:', apiUrl);

        const newSocket = io(apiUrl, {
            auth: { token },
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionAttempts: 20,
            reconnectionDelay: 2000,
            timeout: 20000
        });

        newSocket.on('connect', () => {
            console.log('[Socket] Connected to Game Server (ID:', newSocket.id, ')');
            const client = new {GameName}Client(newSocket);
            client.init((state) => {
                setGameState(state);
                if (state.status === 'playing') {
                    setStatus('playing');
                }
            });

            newSocket.emit('start_game', '{GAME_NAME}');

            setGameClient(client);
            setSocket(newSocket);
            setStatus('lobby');
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
            if (err.message.includes('Authentication error') || err.message.includes('jwt')) {
                alert('登录已过期，请重新登录');
                localStorage.removeItem('token');
                router.push('/');
            }
        });

        return () => {
            newSocket.disconnect();
        };
    }, [router]);

    // 房间列表获取（双通道冗余机制）
    useEffect(() => {
        if (status === 'lobby') {
            console.log('[Room List] Starting room fetch loop for tier:', tier);

            const fetchRoomsViaSocket = () => {
                if (socket && socket.connected) {
                    console.log('[Room List] Emitting get_rooms via Socket');
                    socket.emit('get_rooms', { tier });
                }
            };

            const fetchRoomsViaHttp = async () => {
                try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                    console.log('[Room List] Fetching via HTTP:', `${apiUrl}/api/games/{GAME_NAME}/rooms?tier=${tier}`);
                    const res = await fetch(`${apiUrl}/api/games/{GAME_NAME}/rooms?tier=${tier}`);
                    if (res.ok) {
                        const data = await res.json();
                        console.log('[Room List] Received via HTTP:', data);
                        if (Array.isArray(data)) {
                            setRooms(data);
                        }
                    } else {
                        console.warn('[Room List] HTTP fetch failed:', res.status);
                    }
                } catch (err) {
                    console.error('[Room List] HTTP fetch error:', err);
                }
            };

            // 初始获取
            fetchRoomsViaHttp();
            fetchRoomsViaSocket();

            // 监听 Socket 房间列表
            const handleRoomList = (roomList: any[]) => {
                console.log('[Room List] Received via Socket:', roomList);
                if (Array.isArray(roomList)) {
                    setRooms(roomList);
                }
            };

            if (socket) {
                socket.on('room_list', handleRoomList);
            }

            // 每 5 秒轮询（双通道冗余）
            const interval = setInterval(() => {
                fetchRoomsViaHttp();
                fetchRoomsViaSocket();
            }, 5000);

            return () => {
                if (socket) {
                    socket.off('room_list', handleRoomList);
                }
                clearInterval(interval);
            };
        }
    }, [status, socket, tier]);

    const handleFindMatch = () => {
        if (!gameClient) return;
        setStatus('matching');
        gameClient.joinTier(tier);
    };

    const handleJoinRoom = (roomId: string) => {
        if (!gameClient) return;
        setStatus('matching');
        gameClient.joinRoom(tier, roomId);
    };

    const handleMove = (move: any) => {
        if (gameClient) {
            gameClient.makeMove(move);
        }
    };

    // 连接中
    if (status === 'connecting') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100">
                <div className="text-2xl font-bold text-amber-900 animate-pulse">连接服务器中...</div>
            </div>
        );
    }

    // 大厅（房间列表）
    if (status === 'lobby') {
        return (
            <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100 p-4">
                <div className="w-full max-w-4xl mt-8">
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6 flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-amber-900">🎮 {游戏名称} - {tier === 'free' ? '免费室' : tier === 'beginner' ? '初级室' : tier === 'intermediate' ? '中级室' : '高级室'}</h1>
                            <p className="text-gray-600">选择一个空闲桌子加入，或点击快速开始</p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={handleFindMatch}
                                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg transform transition hover:scale-105"
                            >
                                ⚡ 快速开始
                            </button>
                            <button
                                onClick={() => router.push('/game/{GAME_NAME}')}
                                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-all"
                            >
                                退出房间
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rooms.map((room) => (
                            <div key={room.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-amber-100 shadow-md hover:shadow-lg transition-all">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-bold text-amber-900">桌号: {room.id.split('_').pop()}</span>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${room.status === 'waiting' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {room.status === 'waiting' ? '等待中' : '游戏中'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
                                    <span>人数: {room.players}/2</span>
                                    <span>观众: {room.spectators}</span>
                                </div>
                                <button
                                    onClick={() => handleJoinRoom(room.id)}
                                    disabled={room.status !== 'waiting' || room.players >= 2}
                                    className={`w-full py-2 rounded-lg font-bold transition-all ${room.status === 'waiting' && room.players < 2
                                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    {room.status === 'waiting' && room.players < 2 ? '加入游戏' : '已满员'}
                                </button>
                            </div>
                        ))}
                        {rooms.length === 0 && (
                            <div className="col-span-full text-center py-10 text-gray-500">
                                暂无房间，点击"快速开始"创建一个
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 匹配中
    if (status === 'matching') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100">
                <div className="text-3xl font-bold text-amber-900 mb-4 animate-bounce">🔍 寻找对手中...</div>
                <p className="text-gray-600">请稍候，正在为您匹配旗鼓相当的对手</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-8 px-6 py-2 text-gray-500 hover:text-gray-700 underline"
                >
                    取消
                </button>
            </div>
        );
    }

    // 游戏中
    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100 p-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-4 mb-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-amber-900">🎮 {游戏名称}</h1>
                    <button
                        onClick={() => router.push('/game/{GAME_NAME}')}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all"
                    >
                        退出
                    </button>
                </div>

                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                    {gameState && gameState.status === 'playing' && (
                        <{GameName}Board
                            gameState={gameState}
                            onMove={handleMove}
                        />
                    )}

                    {gameState && gameState.status === 'ended' && (
                        <div className="text-center py-10">
                            <div className="text-4xl font-bold text-amber-900 mb-6">
                                {gameState.winner === 'you' ? '🎉 恭喜获胜!' : '😢 遗憾落败'}
                            </div>
                            {gameState.elo && (
                                <div className="text-xl text-gray-700 mb-8">
                                    等级分变化: <span className={gameState.elo.delta > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                                        {gameState.elo.delta > 0 ? '+' : ''}{gameState.elo.delta}
                                    </span>
                                </div>
                            )}
                            <button
                                onClick={() => window.location.reload()}
                                className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105"
                            >
                                再来一局
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
```

---

## 完整示例：创建五子棋游戏

### 步骤 1：创建服务端文件

```bash
# 创建目录
mkdir -p server/src/games/gomoku/logic
mkdir -p server/src/games/gomoku/rooms

# 创建文件（从模板复制并修改）
# 将所有 {GAME_NAME} 替换为 gomoku
# 将所有 {GameName} 替换为 Gomoku
# 将所有 {游戏名称} 替换为 五子棋
```

### 步骤 2：创建客户端文件

```bash
# 创建目录
mkdir -p client/src/components/Gomoku
mkdir -p client/src/app/game/gomoku/play

# 创建文件（从模板复制并修改）
```

### 步骤 3：注册游戏到系统

服务端会自动扫描 `server/src/games/` 目录，无需手动注册。

### 步骤 4：添加 HTTP API 路由

在 `server/src/index.js` 中已有通用路由：

```javascript
// 已存在，无需修改
app.get('/api/games/:gameId/rooms', (req, res) => {
    const { gameId } = req.params;
    const { tier } = req.query;
    
    const game = socketDispatcher.games[gameId];
    if (!game) {
        return res.status(404).json({ message: 'Game not found' });
    }
    
    const rooms = game.getRoomList(tier || 'free');
    res.json(rooms);
});
```

---

## 最佳实践

### 1. 命名规范

- **游戏ID**（文件夹名）：小写，单词间用下划线，如 `chinese_chess`, `gomoku`
- **类名**：大驼峰，如 `ChineseChessManager`, `GomokuRoom`
- **事件名**：小写，游戏ID前缀，如 `chinesechess_move`, `gomoku_join`

### 2. 状态管理

所有游戏状态应包含：
- `status`: 'waiting' | 'playing' | 'ended'
- `players`: 玩家映射
- `turn`: 当前回合
- `board`: 游戏棋盘/状态

### 3. 错误处理

- 使用 `socket.emit('error', { code, message })` 发送错误
- 客户端统一在 `{GameName}Client` 中处理错误

### 4. 日志规范

```javascript
console.log(`[{GameName}] 描述性信息`);
console.warn(`[{GameName}] 警告信息`);
console.error(`[{GameName}] 错误信息`);
```

### 5. 双通道冗余

所有游戏都应实现：
- Socket.IO 实时通信（主通道）
- HTTP API 轮询（备用通道）

### 6. 国际化支持

在 `client/src/lib/i18n.tsx` 中添加游戏相关的翻译键值。

---

## 检查清单

创建新游戏时，请确保完成以下步骤：

- [ ] 服务端：创建 `GameManager`
- [ ] 服务端：创建 `GameRoom`
- [ ] 服务端：创建 `GameRules`
- [ ] 客户端：创建 `GameClient`
- [ ] 客户端：创建 `GameBoard` UI 组件
- [ ] 客户端：创建游戏中心页面 (`page.tsx`)
- [ ] 客户端：创建对局页面 (`play/page.tsx`)
- [ ] 添加国际化翻译
- [ ] 测试双通道冗余机制
- [ ] 测试 ELO 结算
- [ ] 测试游戏豆结算
- [ ] 更新开发文档

---

## 总结

使用此模板系统，您可以在 **1-2 小时内** 完成一个新游戏的基础架构搭建，剩余时间专注于游戏规则和 UI 的实现。

所有游戏共享：
- ✅ 统一的通信协议
- ✅ 双通道冗余机制
- ✅ ELO 等级分系统
- ✅ 游戏豆结算系统
- ✅ 房间管理系统
- ✅ 国际化支持

**Happy Coding! 🎮**
