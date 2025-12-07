# 游戏启动流程完整追踪

## 流程图

```
用户进入游戏房间
    ↓
GameRoomView.tsx 初始化
    ├─ roomClient.init() 被调用
    └─ 监听 table_list 事件
    ↓
用户选择游戏桌 (selectTable)
    ↓
GameRoomClient.selectTable() 被调用
    ├─ 创建 tableClient = new TableClientClass()
    ├─ tableClient.init(onStateUpdate) 注册状态回调
    │   └─ setupCommonListeners() 注册socket事件
    │       ├─ 'table_state'
    │       ├─ 'table_update'
    │       ├─ 'game_start' ← 关键事件！
    │       └─ 'game_countdown'
    └─ tableClient.joinTable(roomId, tableId)
    ↓
后端: GameRoom.selectTable()
    ├─ 创建新GameTable实例
    └─ GameTable.addPlayer()
    ↓
所有玩家准备好 (player_ready 事件)
    ↓
后端: 倒计时完成
    ├─ 发送 'game_countdown' (3, 2, 1)
    ├─ 倒计时=0时: startGame()
    └─ ChineseChessTable.onGameStart() ← 关键！
        └─ 发送 'game_start' 事件给两个玩家
            {
              board: this.board,        // 棋盘初始状态
              turn: this.turn,          // 当前回合 ('r' or 'b')
              mySide: 'r' or 'b',       // 玩家阵营
              players: { r: userId, b: userId },
              playerInfos: [...]
            }
    ↓
前端: GameTableClient.handleGameStart() 被触发
    ├─ updateState({
    │     status: 'playing',
    │     ...data  // 解构 board, turn, mySide, players等
    │  })
    ├─ 调用 onStateUpdate(this.state)
    └─ 调用所有 stateChangeCallbacks
    ↓
前端: GameRoomView.js 的状态回调被触发
    └─ 检测 status === 'playing'
    ├─ 调用 MatchView (ChineseChessMatchView)
    └─ 传入 tableClient={tableClient}
    ↓
前端: ChineseChessMatchView.tsx 渲染
    ├─ 订阅 tableClient.onStateChange()
    ├─ 获取游戏数据:
    │   ├─ boardData = gameClient.getBoard() → this.state.board
    │   ├─ currentTurn = gameClient.getTurn() → this.state.turn
    │   └─ mySide = gameClient.getMySide() → this.state.mySide
    ├─ pieces = useMemo 计算棋子位置
    └─ Canvas useEffect 渲染棋盘和棋子
```

## 关键数据流转点

### 1. Server端 → game_start事件

**文件**: `server/src/games/chinesechess/gamepagehierarchy/ChineseChessTable.js`

**位置**: Lines 108-138

```javascript
onGameStart() {
    const redPlayer = this.players[0];
    const blackPlayer = this.players[1];

    this.players.forEach((player) => {
        const isRed = player.userId === redPlayer.userId;
        this.sendToPlayer(player.socketId, 'game_start', {
            board: this.board,              // ✓ 棋盘数据 (10x9 array)
            turn: this.turn,                // ✓ 当前回合 ('r' or 'b')
            mySide: isRed ? 'r' : 'b',     // ✓ 玩家阵营
            players: {r: redPlayer.userId, b: blackPlayer.userId},
            playerInfos: this.players.map(...)
        });
    });
}
```

**问题检查**:
- [ ] `this.board` 是否已正确初始化为10x9棋盘
- [ ] `this.turn` 是否为 'r'（红方先手）
- [ ] `sendToPlayer()` 是否正确发送给指定玩家

### 2. Client端接收 → GameTableClient.handleGameStart()

**文件**: `client/src/gamecore/hierarchy/GameTableClient.ts`

**位置**: Lines 257-280

```typescript
protected handleGameStart(data: any): void {
    console.log(`[...TableClient] Game starting event received:`, data);
    
    this.updateState({
        status: 'playing',
        ...data,                // ← 解构 board, turn, mySide 等
        canStart: false,
        ready: false,
        countdown: null
    });
    
    // 关键：现在 this.state.board 应该包含棋盘数据
    console.log(`Current state after game start:`, this.state);
}
```

**关键检查**:
- [ ] `data` 对象是否包含 `board` 字段
- [ ] `board` 是否为有效的10x9二维数组
- [ ] `turn` 和 `mySide` 是否被正确解构

### 3. State变化 → updateState() 调用

**文件**: `client/src/gamecore/hierarchy/GameTableClient.ts`

**位置**: Lines 328-355

```typescript
protected updateState(newState: Partial<GameTableState>): void {
    const oldStatus = this.state.status;
    this.state = { ...this.state, ...newState };  // ← this.state.board 更新
    
    console.log(`[...TableClient] updateState called:`, {
        oldStatus,
        newStatus: this.state.status,
        newState: this.state  // ← 应该包含 board
    });
    
    if (this.onStateUpdate) {
        this.onStateUpdate(this.state);  // ← 调用GameRoomView的回调
    }
    
    // 调用所有订阅的状态变化回调（包括ChineseChessMatchView）
    this.stateChangeCallbacks.forEach(callback => {
        try {
            callback();  // ← 触发re-render
        } catch (err) {
            console.error(`[...TableClient] Error calling callback:`, err);
        }
    });
}
```

**关键检查**:
- [ ] `this.state` 是否被正确更新
- [ ] `onStateUpdate` 回调是否被调用
- [ ] `stateChangeCallbacks` 数组是否有效且回调被执行

### 4. GameRoomView 检测游戏开始

**文件**: `client/src/gamecore/hierarchy/GameRoomView.tsx`

**位置**: Lines 70-95

```typescript
if (myTableId) {
    if (roomState.tables && roomState.tables.length > 0) {
        const myTable = roomState.tables.find((t) => t.tableId === myTableId);
        if (myTable && myTable.status === 'playing') {
            shouldShowGame = true;  // ← 显示游戏
        }
    }
    
    // 备选：从 tableClient 查找
    if (!shouldShowGame && tableClient) {
        const tableState = tableClient.getState();
        if (tableState.status === 'playing') {
            shouldShowGame = true;
        }
    }
}
```

**关键检查**:
- [ ] `roomState.tables` 是否被更新（需要table_update事件）
- [ ] `tableState.status` 是否为 'playing'
- [ ] `shouldShowGame` 是否被正确设置

### 5. ChineseChessMatchView 获取棋盘数据

**文件**: `client/src/games/chinesechess/gamepagehierarchy/ChineseChessMatchView.tsx`

**位置**: Lines 93-107

```typescript
if (gameClient) {
    boardData = gameClient.getBoard?.() || null;      // ← 应该返回二维数组
    currentTurn = gameClient.getTurn?.() || 'r';      // ← 应该返回 'r' or 'b'
    mySide = gameClient.getMySide?.();                 // ← 应该返回 'r' or 'b'
    state = gameClient.getState?.() || {};
}
```

**对应的 getBoard() 方法**:

```typescript
public getBoard(): any {
    return this.state.board || [];  // ← 关键：this.state.board 必须存在
}
```

**关键检查**:
- [ ] `gameClient.getBoard()` 是否返回有效的二维数组
- [ ] 如果返回 `[]` 则说明 `this.state.board` 未被设置
- [ ] 原因可能是 game_start 事件未被接收或未被正确处理

### 6. Canvas 渲染

**文件**: `client/src/games/chinesechess/gamepagehierarchy/ChineseChessMatchView.tsx`

**位置**: Lines 223-430 (useEffect)

```typescript
useEffect(() => {
    // ...
    if (!boardData || boardData.length === 0) {
        // 显示 "游戏初始化中..." ← 可能卡在这里！
        ctx.fillText('游戏初始化中...', ...);
        return;
    }
    
    // 绘制棋盘和棋子
    drawBoard();
    drawPieces();
}, [pieces, selectedPiece]);
```

**关键检查**:
- [ ] 是否卡在 "游戏初始化中..." 的显示
- [ ] 说明 `boardData` 为 null 或 length === 0
- [ ] 追溯原因：getBoard() 返回了什么？

## 调试清单

### 第一步：Server端检查
- [ ] 启动server，查看日志是否有 "[ChineseChess] 游戏开始" 消息
- [ ] 确认 game_start 事件被发送

### 第二步：Network检查
- [ ] 打开浏览器DevTools → Network
- [ ] 查看Socket事件是否包含 game_start 消息
- [ ] 查看 game_start 数据是否包含 board 字段

### 第三步：Client console检查
- [ ] 查看 "[...TableClient] Game starting event received" 日志
  - 应该看到完整的 data 对象，包含 board
- [ ] 查看 "[...TableClient] updateState called" 日志
  - 应该看到 newState 包含 board
- [ ] 查看 "[ChineseChessMatchView] boardData: ..." 日志（需要添加）
  - 应该看到二维数组，不应该是 null

### 第四步：State检查
- [ ] 在浏览器DevTools的Sources中设置断点
- [ ] 在 handleGameStart() 中断点，检查 data 对象
- [ ] 在 ChineseChessMatchView 的 getBoard() 调用处断点，检查返回值

## 可能的问题点

### 问题A：game_start 事件未被发送
**症状**: 服务器没有日志 "[ChineseChess] 游戏开始"
**原因**: 
- [ ] 倒计时未完成
- [ ] startGame() 未被调用
- [ ] 可能需要两个玩家都准备好

**解决**: 检查服务器的ready逻辑

### 问题B：game_start 事件未被接收
**症状**: 客户端没有日志 "Game starting event received"
**原因**:
- [ ] Socket连接断开
- [ ] 事件监听器未注册（setupCommonListeners未被调用）
- [ ] tableClient.init() 未被调用

**解决**: 检查 selectTable() 是否调用了 tableClient.init()

### 问题C：data 对象不包含 board
**症状**: game_start 事件接收到，但 data.board 是 undefined
**原因**:
- [ ] Server端 this.board 未初始化
- [ ] Server端 sendToPlayer() 参数错误
- [ ] 网络传输问题

**解决**: 检查 ChineseChessTable.onGameStart() 中 this.board 的值

### 问题D：this.state.board 未被更新
**症状**: updateState() 被调用，但 this.state.board 仍为 undefined
**原因**:
- [ ] 解构 ...data 失败（data 不是对象）
- [ ] board 字段名错误（大小写问题）

**解决**: 添加日志检查 data 对象和 this.state 对象

### 问题E：getBoard() 返回空数组
**症状**: gameClient.getBoard() 返回 [] 而不是棋盘数据
**原因**:
- [ ] this.state.board 为 undefined 或 null
- [ ] onStateChange() 回调未被触发
- [ ] useMemo 依赖问题

**解决**: 检查 this.state.board 的值

## 快速诊断脚本

在ChineseChessMatchView中添加调试代码：

```typescript
// 在获取游戏状态后添加
console.log('[DEBUG] gameClient:', gameClient);
console.log('[DEBUG] gameClient.getState():', gameClient.getState?.());
console.log('[DEBUG] boardData:', boardData);
console.log('[DEBUG] boardData length:', boardData?.length);
console.log('[DEBUG] boardData[0]:', boardData?.[0]);

// 在useEffect订阅后添加
console.log('[DEBUG] pieces count:', pieces.length);
console.log('[DEBUG] currentTurn:', currentTurn);
console.log('[DEBUG] mySide:', mySide);
```
