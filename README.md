# 🎮 HappyGames - Pi Network 游戏平台

基于 Pi Network 生态的多人在线游戏平台，支持多种棋牌游戏，采用 ELO 等级分系统和游戏豆经济模型。

## 📚 文档导航

### 主要文档
- **[开发文档](./development_docs.md)** - 完整的项目架构、功能说明和开发指南
- **[游戏开发模板指南](./GAME_TEMPLATE_GUIDE.md)** - 快速创建新游戏的完整模板系统
- **[通信模板使用指南](./COMMUNICATION_TEMPLATE_GUIDE.md)** - Socket.IO + HTTP 双通道通信模板 ⭐
- **[UI 模板使用指南](./UI_TEMPLATE_GUIDE.md)** - 游戏 UI 组件模板系统 ⭐
- **[匹配系统使用指南](./MATCH_SYSTEM_GUIDE.md)** - 完整的玩家匹配系统模板 ⭐

### 快速链接
- [项目概览](./development_docs.md#1-项目概览-project-overview)
- [技术栈](./development_docs.md#技术栈-tech-stack)
- [游戏开发模板](./development_docs.md#14-游戏开发模板系统-game-development-template-system)
- [CORS 问题修复](./development_docs.md#131-cors-跨域问题修复-2025-11-27)

## 🚀 快速开始

### 环境要求
- Node.js 16+
- MongoDB 4.4+
- Pi Network SDK

### 安装依赖
```bash
# 服务端
cd server
npm install

# 客户端
cd client
npm install
```

### 运行项目
```bash
# 服务端（开发模式）
cd server
npm run dev

# 客户端（开发模式）
cd client
npm run dev
```

## 🎯 核心特性

- ✅ **多游戏支持**: 中国象棋、五子棋等（可快速扩展）
- ✅ **ELO 等级分系统**: 公平的技能评估与匹配
- ✅ **智能匹配系统**: 自动匹配 + 手动入座，支持底豆、胜率、掉线率筛选
- ✅ **游戏豆经济**: Pi 币兑换游戏豆，赢取奖励
- ✅ **推广佣金系统**: 5 级推广员体系
- ✅ **国际化**: 支持 14 种语言
- ✅ **高可用架构**: Socket.IO + HTTP 双通道冗余
- ✅ **称号系统**: 基于排名的荣誉称号

## 🎮 添加新游戏

使用我们的模板系统，快速开发新游戏！

### 1. 游戏开发模板（1-2 小时）
完整的游戏逻辑和UI模板：
- 📄 [游戏开发模板指南](./GAME_TEMPLATE_GUIDE.md)
- 🎯 包含服务端和客户端完整代码
- ✅ 自动集成 ELO、游戏豆结算等功能

### 2. 通信模板系统（10 分钟）⭐
标准化的通信层模板：
- 📄 [通信模板使用指南](./COMMUNICATION_TEMPLATE_GUIDE.md)
- 🔌 自动获得 Socket.IO + HTTP 双通道冗余
- 🎯 标准化的事件处理和状态管理

### 3. UI 模板系统（5 分钟）⭐
标准化的 UI 组件模板：
- 📄 [UI 模板使用指南](./UI_TEMPLATE_GUIDE.md)
- 🎨 统一的视觉风格和交互体验
- 🧩 包含等级选择、房间列表、对局布局

### 4. 匹配系统（10 分钟）⭐
完整的玩家匹配系统：
- 📄 [匹配系统使用指南](./MATCH_SYSTEM_GUIDE.md)
- 🎯 自动匹配 + 手动入座
- ⚙️ 底豆、胜率、掉线率筛选
- ⏱️ 准备/开始机制（30秒倒计时）
- 🧹 僵尸桌清理（5分钟无匹配）
- 👁️ 旁观功能（防作弊）

## 📖 技术文档

完整的技术文档请查看 [development_docs.md](./development_docs.md)，包含：

1. 项目概览与技术栈
2. 设计风格与主题
3. 页面布局详解
4. 资产中心实现
5. 国际化支持
6. 用户资料系统
7. 游戏逻辑与经济模型
8. 游戏大厅设计
9. 平台核心架构
10. ELO 等级分系统
11. 称号系统
12. 中国象棋游戏
13. 生产环境问题修复记录
14. **游戏开发模板系统** ⭐

## 🛠️ 技术栈

**前端**:
- Next.js 14 (React)
- TypeScript
- TailwindCSS
- Socket.IO Client

**后端**:
- Node.js
- Express
- Socket.IO
- MongoDB

## 📂 项目结构

```
HappyGames/
├── server/
│   └── src/
│       ├── gamecore/          # 核心模板系统 ⭐
│       │   ├── BaseGameManager.js       # 游戏管理器基类
│       │   ├── MatchableGameRoom.js     # 可匹配游戏房间基类
│       │   ├── MatchRoomState.js        # 匹配房间状态管理
│       │   ├── AutoMatchManager.js      # 自动匹配管理器
│       │   ├── EloService.js            # ELO 等级分服务
│       │   └── socket.js                # Socket.IO 配置
│       └── games/             # 具体游戏实现
│           └── chinesechess/  # 中国象棋（参考实现）
└── client/
    └── src/
        ├── gamecore/          # 客户端模板系统 ⭐
        │   ├── GameClientTemplate.ts  # 游戏客户端模板
        │   ├── useRoomList.ts         # 双通道房间列表 Hook
        │   └── BaseGameClient.ts      # 游戏客户端基类
        └── components/
            ├── GameTemplates/ # UI 模板系统 ⭐
            │   ├── GameTierSelector.tsx      # 等级选择组件
            │   ├── GameRoomList.tsx          # 房间列表组件
            │   ├── GamePlayLayout.tsx        # 对局布局组件
            │   └── MatchSettingsPanel.tsx    # 匹配设置面板
            └── ChineseChess/  # 中国象棋（参考实现）
```

## 📝 许可证

MIT License

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

---

**Happy Gaming! 🎉**