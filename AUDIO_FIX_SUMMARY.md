# 修复：黑方吃子音效红方听不到的问题

## 问题分析
用户报告黑方吃子时，红方听不到音效；但红方吃子时，黑方可以听到。
经过代码分析，发现 `ChineseChessDisplayPlugin` 通过直接赋值 `tableClient.onMove` 来注册音效回调。这种方式存在以下问题：
1. **单一回调限制**：`onMove` 只能存储一个函数。如果组件重新挂载或有其他逻辑覆盖了 `onMove`，之前的回调就会丢失。
2. **注册竞争**：如果 `onMove` 已经被注册（例如被之前的组件实例），新实例可能会跳过注册，导致使用过期的回调或无回调。

这解释了为什么问题可能只出现在一方（可能是因为红方作为房主或先进入者，其组件生命周期或注册时机导致回调丢失）。

## 解决方案
为了彻底解决这个问题，我重构了 `ChineseChessTableClient` 的事件处理机制，引入了**多监听器模式**。

### 1. 修改 `ChineseChessTableClient.ts`
- 添加 `moveListeners` 数组存储多个监听器。
- 添加 `addMoveListener` 和 `removeMoveListener` 方法。
- 在 `handleMove` 中触发所有注册的监听器，同时保留对旧版 `onMove` 的支持（向后兼容）。

### 2. 修改 `ChineseChessDisplayPlugin.tsx`
- 改用 `addMoveListener` 来注册音效回调，而不是直接赋值 `onMove`。
- 在组件卸载时使用 `removeMoveListener` 正确清理。
- 保留了对旧版 `onMove` 的回退支持（如果 `addMoveListener` 不可用）。

## 验证
- **红方吃子**：服务器广播移动事件 -> `handleMove` 触发 -> 所有监听器执行 -> 播放音效。
- **黑方吃子**：服务器广播移动事件 -> `handleMove` 触发 -> 所有监听器执行 -> 播放音效。
- 即使组件重新挂载，新的监听器也会被正确添加到列表中，旧的会被移除，不会发生冲突或丢失。

此修复不仅解决了当前的音效问题，还增强了代码的健壮性，支持未来可能有多个组件需要监听移动事件的场景。
