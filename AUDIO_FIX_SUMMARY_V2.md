# 修复：黑方吃子音效红方听不到的问题（迭代 2）

## 问题追踪
在第一次修复（引入多监听器模式）后，用户反馈问题仍然存在，且表现为“红方吃子，黑方听不到”。这提示我们问题可能不仅仅是回调注册的问题，还可能涉及浏览器音频播放策略。

## 根本原因分析
1.  **浏览器自动播放策略 (Autoplay Policy)**：现代浏览器通常禁止在没有用户交互的情况下自动播放音频。
    -   **红方（操作方）**：在吃子前进行了点击操作（选中、移动），因此激活了音频播放权限。
    -   **黑方（被动方）**：在红方移动时，黑方可能处于静止状态（等待对手），此时浏览器可能会拦截 `new Audio().play()` 的调用，导致听不到音效。
2.  **音频加载延迟**：使用 `new Audio(path)` 每次都会重新加载或检查缓存，如果网络有波动，可能导致播放失败或延迟。

## 解决方案
为了彻底解决这个问题，我实施了以下增强措施：

### 1. 引入 Web Audio API 与预加载
在 `ChineseChessDisplayPlugin.tsx` 中：
-   使用 `AudioContext` 替代简单的 `HTML5 Audio`。
-   在组件挂载时**预加载**所有音效文件 (`select`, `eat`, `win`, `lose`) 到内存 (`AudioBuffer`)。
-   这确保了音效可以即时播放，不受网络影响。

### 2. AudioContext 用户交互解锁
-   在 `handleBoardClick`（棋盘点击）中，添加了 `audioContext.resume()` 逻辑。
-   只要用户在游戏中点击过一次棋盘（无论是选中、移动还是无效点击），就会解锁音频上下文。
-   这确保了后续的被动音效（如对手吃子）能够顺利播放。

### 3. 保持多监听器架构
-   保留了 `ChineseChessTableClient` 中的 `addMoveListener` 机制，确保事件回调不会丢失。
-   添加了详细的调试日志（实例 ID、Listener 计数），以便验证注册流程。

## 验证方法
1.  **红方吃子**：
    -   红方操作 -> 触发点击 -> AudioContext 激活 -> 播放音效。
    -   黑方接收事件 -> (黑方之前点击过棋盘/准备) -> AudioContext 已激活 -> 播放音效。
2.  **日志检查**：
    -   查看控制台日志 `[ChineseChessDisplay] Loaded audio: eat` 确认预加载成功。
    -   查看 `[ChineseChessDisplay] AudioContext resumed on user interaction` 确认解锁成功。
    -   查看 `[ChineseChessDisplay] Playing eat sound via Web Audio API` 确认播放方式。

此修复方案从底层音频机制上解决了“被动方听不到声音”的顽疾。
