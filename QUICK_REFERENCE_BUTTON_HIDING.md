# 游戏倒计时按钮隐藏功能 - 快速参考

## 功能概述

**需求**: 隐藏离开和取消按钮，此时玩家只能等到游戏结束才能退出游戏桌

**实现**: 当游戏倒计时（3-2-1）开始或游戏进行中时，隐藏"退出"按钮

## 核心实现

### 1. 添加状态变量
```typescript
const [countdownActive, setCountdownActive] = useState(false);
```

### 2. 倒计时检测
```typescript
const state = tableClient.getState?.();
const isCountdownActive = state?.countdown?.type === 'start' || state?.status === 'playing';
setCountdownActive(isCountdownActive);
```

### 3. 条件隐藏
```tsx
display: countdownActive ? 'none' : 'flex'
```

## 状态流转

```
等待中 (waiting)
├─ countdown: null
├─ countdownActive: false
└─ 按钮: 显示 ✓

↓ 所有玩家准备

匹配中 (matching)
├─ countdown: null
├─ countdownActive: false
└─ 按钮: 显示 ✓

↓ 游戏开始倒计时

**倒计时 (3-2-1)**
├─ countdown.type: 'start'
├─ status: 'matching'
├─ countdownActive: true
└─ 按钮: 隐藏 ✗

↓ 倒计时结束

**游戏进行中 (playing)**
├─ countdown.type: 'start'
├─ status: 'playing'
├─ countdownActive: true
└─ 按钮: 隐藏 ✗

↓ 游戏结束

匹配中 (matching)
├─ countdown.type: 'rematch'
├─ status: 'matching'
├─ countdownActive: false
└─ 按钮: 显示 ✓
```

## 修改文件

**文件**: `client/src/games/chinesechess/gamepagehierarchy/ChineseChessDisplayPlugin.tsx`

**修改点**:
- 第 56 行: 添加 `countdownActive` 状态
- 第 69-70 行: 添加倒计时检测
- 第 347 行: 修改按钮的 display 样式

## 工作原理

```
Socket 事件
  ↓
game_countdown 事件 (count: 3)
  ↓
GameTableClient 接收并更新状态
  ↓
updateState({ countdown: { type: 'start', ... } })
  ↓
onStateChange() 回调
  ↓
React 组件 updateGameState()
  ↓
getState() 读取最新状态
  ↓
isCountdownActive = true
  ↓
display: 'none' → 按钮隐藏
```

## 关键代码片段

### 状态初始化
```typescript
const [countdownActive, setCountdownActive] = useState(false);
```

### 倒计时检测（在 updateGameState 中）
```typescript
// 获取倒计时状态 - 检查是否在游戏开始倒计时或正在游戏中
const state = tableClient.getState?.();
const isCountdownActive = state?.countdown?.type === 'start' || state?.status === 'playing';
setCountdownActive(isCountdownActive);
```

### 按钮隐藏（退出按钮）
```tsx
<div 
  style={{
    display: countdownActive ? 'none' : 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}
>
  <img
    src="/images/chinesechess/buttoms/exit.png"
    alt="退出"
    title="退出"
    style={{ width: '50px', height: '50px', cursor: 'pointer', display: 'block' }}
    onClick={onLeaveTable}
  />
</div>
```

## 调试技巧

### 查看倒计时状态
在浏览器控制台中执行：
```javascript
// 假设 tableClient 在全局或组件状态中
console.log(tableClient.getState().countdown);
console.log(tableClient.getState().status);
```

### 手动触发倒计时
在 Node.js 服务器中：
```javascript
table.broadcast('game_countdown', { count: 3 });
```

### 检查按钮显示状态
```javascript
// 应该返回 'none' 当 countdownActive === true
document.querySelector('img[alt="退出"]')?.parentElement?.style?.display
```

## 常见问题

### Q: 按钮为什么没有隐藏？
A: 检查以下几点：
1. `tableClient.getState()` 是否返回了状态
2. `countdown.type` 是否为 'start'
3. `status` 是否为 'playing'
4. 浏览器是否刷新了页面

### Q: 按钮隐藏后如何重新显示？
A: 当倒计时停止或游戏结束时，countdown 状态会改变，按钮会自动重新显示。

### Q: 其他按钮也应该隐藏吗？
A: 目前只隐藏退出按钮。其他按钮（如"认输"、"讲和"）可在游戏进行中使用。

## 相关文件

- GameTableClient.ts: Socket 事件处理和状态管理
- MatchPlayers.js: 服务器端倒计时实现
- BUTTON_HIDING_FEATURE.md: 详细文档
- IMPLEMENTATION_VERIFICATION_REPORT.md: 验证报告

## 后续优化

1. 添加倒计时显示（3-2-1 数字）
2. 添加文字提示（"游戏进行中..."）
3. 为其他游戏类型（Gomoku、Mahjong、Poker）添加
4. 支持观战者功能
5. 处理再来一局倒计时

## 性能指标

- 内存增加: ~1 字节（1 个布尔值）
- CPU 开销: O(1) 比较操作
- 渲染开销: 仅改变 CSS，无 DOM 操作
- 网络开销: 0（使用现有 Socket 事件）

## 兼容性

- ✅ 支持所有现代浏览器
- ✅ 完全向后兼容
- ✅ 无依赖增加
- ✅ 无 API 改变

## 部署检查

- ✅ 代码完成
- ✅ 类型检查通过
- ✅ 文档完成
- ✅ 验证通过
- ✅ 可部署
