# 🎨 游戏 UI 模板系统使用指南

## 📋 目录
1. [概述](#概述)
2. [组件库](#组件库)
3. [使用示例](#使用示例)
4. [最佳实践](#最佳实践)

---

## 概述

UI 模板系统提供了一套标准化的 React 组件，用于快速构建游戏界面。这些组件封装了 HappyGames 平台的统一设计风格，确保所有游戏具有一致的用户体验。

### 核心组件

- 🚪 **GameTierSelector**: 游戏等级选择页面（游戏中心）
- 📋 **GameRoomList**: 房间列表页面（大厅）
- 🎮 **GamePlayLayout**: 游戏对局页面（游戏室）

### 文件位置

所有模板组件位于 `client/src/components/GameTemplates/` 目录下。

---

## 组件库

### 1. GameTierSelector (游戏等级选择)

用于展示游戏的四个等级（免费、初级、中级、高级）供玩家选择。

**Props**:
- `gameName`: 游戏中文名（如 "五子棋"）
- `gameNameEn`: 游戏英文名（如 "Gomoku"）
- `gamePath`: 游戏路由路径（如 "/game/gomoku"）
- `userStats`: 用户战绩数据
- `tiers`: (可选) 自定义等级配置
- `onBack`: (可选) 自定义返回按钮行为

### 2. GameRoomList (房间列表)

用于展示当前等级下的所有房间列表。

**Props**:
- `gameName`: 游戏名称
- `tier`: 当前等级 ID
- `rooms`: 房间数据数组
- `onJoinRoom`: 加入房间回调
- `onQuickStart`: 快速开始回调
- `onLeave`: 退出房间回调

### 3. GamePlayLayout (游戏对局布局)

用于包裹具体的游戏棋盘组件，提供统一的头部和结算界面。

**Props**:
- `gameName`: 游戏名称
- `gameState`: 游戏状态对象
- `onLeave`: 退出回调
- `onRestart`: 再来一局回调
- `children`: 具体的游戏棋盘组件

---

## 使用示例

### 1. 游戏中心页面 (`page.tsx`)

```tsx
import { GameTierSelector } from '@/components/GameTemplates/GameTierSelector';

export default function GomokuCenter() {
    // ... 获取 userStats 逻辑 ...

    return (
        <GameTierSelector
            gameName="五子棋"
            gameNameEn="Gomoku"
            gamePath="/game/gomoku"
            userStats={userStats}
        />
    );
}
```

### 2. 游戏对局页面 (`play/page.tsx`)

```tsx
import { GameRoomList } from '@/components/GameTemplates/GameRoomList';
import { GamePlayLayout } from '@/components/GameTemplates/GamePlayLayout';

export default function GomokuPlay() {
    // ... 状态管理逻辑 ...

    // 1. 连接中状态
    if (status === 'connecting') {
        return <LoadingScreen />;
    }

    // 2. 大厅状态（房间列表）
    if (status === 'lobby') {
        return (
            <GameRoomList
                gameName="五子棋"
                tier={tier}
                rooms={rooms}
                onJoinRoom={handleJoinRoom}
                onQuickStart={handleQuickStart}
                onLeave={handleLeave}
            />
        );
    }

    // 3. 游戏状态
    return (
        <GamePlayLayout
            gameName="五子棋"
            gameState={gameState}
            onLeave={handleLeave}
            onRestart={() => window.location.reload()}
        >
            {/* 具体的游戏棋盘组件 */}
            <GomokuBoard 
                board={gameState.board} 
                onMove={handleMove} 
            />
        </GamePlayLayout>
    );
}
```

---

## 最佳实践

1. **组合使用**: 结合 `useRoomList` Hook 和 `GameRoomList` 组件，可以极快地构建大厅界面。
2. **自定义内容**: `GamePlayLayout` 通过 `children` 属性接收任意内容，因此你可以自由实现任何类型的游戏界面（棋牌、卡牌等），同时保持统一的外框。
3. **响应式设计**: 所有模板组件都内置了响应式设计，适配移动端和桌面端。

---

**Happy Coding! 🎨**
