# 🎯 简化架构提案

## 当前架构（复杂）

```
Socket
  ↓
GameTableClient → 监听 game_start
  ↓ (创建)
GameMatchClient → 监听 game_start (重复！)
  ↓ (使用)
ChineseChessMatchView
```

**问题**: 两层都监听 game_start，导致重复处理和状态混乱

## 简化后架构（推荐）

```
Socket
  ↓
GameTableClient (直接管理所有游戏状态)
  ↓ (包含)
- 棋盘数据
- 当前回合
- 玩家信息
- 游戏规则
  ↓ (使用)
ChineseChessMatchView
```

**优点**:
- ✅ 只有一个客户端，更清晰
- ✅ 没有事件重复问题
- ✅ 状态更新直接
- ✅ 初始化过程简单

## 迁移步骤

### 1. 将游戏方法移动到 GameTableClient
- `getBoard()` - 直接从 GameTableClient 获取
- `getTurn()` - 直接从 GameTableClient 获取
- `getMySide()` - 直接从 GameTableClient 获取
- `sendMove()` - 直接在 GameTableClient 中实现

### 2. 修改 ChineseChessMatchView
- 不再使用 ChineseChessMatchClient
- 直接使用 tableClient (即 GameTableClient)
- tableClient.getBoard() / getTurn() / sendMove() 等

### 3. 删除 GameMatchClient 相关代码
- 可以保留基类，但不使用
- 简化事件流

## 实施方案

### GameTableClient 中添加游戏特定方法

```typescript
// GameTableClient 中
public getBoard(): any[][] {
    return this.state.board || [];
}

public getTurn(): string {
    return this.state.turn || 'r';
}

public getMySide(): string | undefined {
    return this.state.mySide;
}

public sendMove(fromX: number, fromY: number, toX: number, toY: number): void {
    this.socket.emit('chinesechess_move', { fromX, fromY, toX, toY });
}

public onStateChange(callback: () => void): () => void {
    // 返回取消订阅函数
    ...
}
```

### ChineseChessMatchView 中修改

```typescript
// 直接使用 tableClient 而不是 matchClient
export function ChineseChessMatchView({ tableClient, onBack }: Props) {
    if (!tableClient) return <ErrorUI />;
    
    const boardData = tableClient.getBoard();
    const currentTurn = tableClient.getTurn();
    const mySide = tableClient.getMySide();
    
    // 直接使用 tableClient
    tableClient.sendMove(fx, fy, tx, ty);
}
```

## 预期结果

- 🎯 游戏启动不再闪退
- 🎯 棋盘数据正确显示
- 🎯 玩家可以正常走棋
- 🎯 代码更简洁易维护
