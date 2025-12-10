# 音效重复播放问题修复报告

## 问题描述
用户报告："吃子的时候，吃子音效有时好像被调用了多次"

即在进行中国象棋游戏时，当一方吃掉对方的棋子时，吃子音效 (`CHESS_EAT.mp3`) 有时会播放多次，而不是正常的一次。

## 根本原因分析

### 调查过程
1. **服务器端**: `ChineseChessTable.js` 中的 `handleMove()` 方法调用 `this.broadcast('move', {...})` 广播移动事件
2. **客户端通信**: `ChineseChessTableClient.ts` 中监听 'move' 事件并调用 `handleMove()` 
3. **音效触发**: `handleMove()` 中调用 `this.onMove(data)` 回调
4. **UI注册**: `ChineseChessDisplayPlugin.tsx` 在 useEffect 中注册 onMove 回调，播放音效

### 可能的重复原因

虽然代码设计上单个 move 事件只应触发一次音效，但以下情况可能导致重复播放：

1. **事件广播重复**: 虽然代码中只看到一次 `broadcast('move')` 调用，但网络延迟或其他因素可能导致多次接收
2. **回调重新注册**: `ChineseChessDisplayPlugin.tsx` 的 useEffect 依赖包括 `updateGameState`，如果依赖频繁变化，可能导致回调重新注册
3. **关键**: useEffect 中检查 `if ((tableClient as any).onMove === undefined)` 来判断是否已注册，但清理函数设置为 `undefined`，重新进入时可能重新注册

## 实施的修复方案

### 1. 添加防重复音效播放机制

在 `ChineseChessDisplayPlugin.tsx` 中实施了**100毫秒防重触发机制**：

```typescript
// 跟踪上次播放的音效时间，防止重复播放
const lastAudioTimeRef = useRef<{ [key: string]: number }>({ select: 0, eat: 0 });

const playSound = useCallback((type: 'select' | 'eat') => {
  try {
    const now = Date.now();
    const lastTime = lastAudioTimeRef.current[type] || 0;
    
    // 防止100ms内重复播放同一音效（防止重复触发）
    if (now - lastTime < 100) {
      console.log(`[ChineseChessDisplay] Skipping audio ${type} - played too recently`);
      return;
    }
    
    lastAudioTimeRef.current[type] = now;
    
    const audioPath = type === 'select' 
      ? '/audio/effects/CHESS_SELECT.mp3' 
      : '/audio/effects/CHESS_EAT.mp3';
    
    console.log(`[ChineseChessDisplay] Playing ${type} sound at ${now}`);
    const audio = new Audio(audioPath);
    audio.play().catch(err => console.warn('Audio play failed:', err));
  } catch (err) {
    console.error('Error playing sound:', err);
  }
}, []);
```

### 2. 添加详细的日志记录

为了便于后续调试，添加了多个日志点：

**服务器端** (`ChineseChessTable.js` line 254):
```javascript
console.log(`[ChineseChessTable] Broadcasting move: captured=${captured ? captured : null}, from=(${fromX},${fromY}) to=(${toX},${toY})`);
```

**客户端接收** (`ChineseChessTableClient.ts` line 37):
```typescript
console.log(`[${this.gameType}TableClient] Move event received from server:`, { move: data.move, captured: data.captured });
```

**处理器调用** (`ChineseChessTableClient.ts` line 63):
```typescript
console.log(`[ChineseChessTableClient] handleMove: Calling onMove callback, captured=${data.captured}`);
```

**音效播放** (`ChineseChessDisplayPlugin.tsx`):
- 回调注册: `console.log('[ChineseChessDisplay] Registering onMove callback');`
- 回调触发: `console.log('[ChineseChessDisplay] onMove callback triggered:', { captured: data.captured });`
- 音效播放: `console.log('[ChineseChessDisplay] Playing eat sound');`
- 防重跳过: `console.log('[ChineseChessDisplay] Skipping audio ${type} - played too recently');`

## 修改的文件

1. **server/src/games/chinesechess/gamepagehierarchy/ChineseChessTable.js**
   - 添加 move 事件广播的日志

2. **client/src/games/chinesechess/gamepagehierarchy/ChineseChessTableClient.ts**
   - 添加 move 事件接收和处理的日志
   - 改进 handleMove() 中的 onMove 调用日志

3. **client/src/games/chinesechess/gamepagehierarchy/ChineseChessDisplayPlugin.tsx**
   - 导入 `useRef` hook
   - 添加 `lastAudioTimeRef` 来跟踪最后播放时间
   - 改进 `playSound()` 函数，添加100ms防重触发机制
   - 添加详细的日志记录所有音效相关操作

## 防重机制的原理

**时间防重触发** (Debouncing by Time):
- 记录每种音效 (select/eat) 最后一次播放的时间
- 如果距离上次播放不足100毫秒，则跳过本次播放
- 100毫秒是一个合理的时间窗口：
  - 足够防止快速的重复调用
  - 用户听不出100毫秒的差异
  - 不会影响正常的音效播放

## 预期结果

1. 即使 move 事件被广播多次，由于防重机制，音效也只会在100ms内播放一次
2. 日志可以帮助诊断是否存在真正的事件重复问题
3. 如果问题仍然存在，服务器日志会显示 move 事件是否被多次广播

## 测试方法

1. 进行中国象棋游戏
2. 进行多次吃子操作
3. 在浏览器控制台查看日志，确认：
   - `[ChineseChessDisplay] Playing eat sound` 的次数
   - `[ChineseChessDisplay] Skipping audio eat - played too recently` 是否出现
4. 在服务器日志中查看 move 事件的广播次数

## 后续改进

如果日志显示 move 事件确实被广播多次，可以考虑以下改进：

1. **服务器端去重**: 在 ChineseChessTable.js 中检查是否已为该移动广播过事件
2. **改进 useEffect 依赖**: 优化 ChineseChessDisplayPlugin.tsx 中 useEffect 的依赖数组，减少不必要的重新注册
3. **事件去重机制**: 在客户端实施基于 move ID 或时间戳的事件去重

