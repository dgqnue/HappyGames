<!--# 🎮 HappyGames - Pi Network 游戏平台

基于 Pi Network 生态的多人在线游戏平台，支持多种棋牌游戏，采用 ELO 等级分系统和游戏豆经济模型。

## 📚 文档导航

### 主要文档
- **[开发文档](./development_docs.md)** - 完整的项目架构、功能说明和开发指南
- **[游戏开发模板指南](./GAME_TEMPLATE_GUIDE.md)** - 快速创建新游戏的完整模板系统

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
- ✅ **游戏豆经济**: Pi 币兑换游戏豆，赢取奖励
- ✅ **推广佣金系统**: 5 级推广员体系
- ✅ **国际化**: 支持 14 种语言
- ✅ **高可用架构**: Socket.IO + HTTP 双通道冗余
- ✅ **称号系统**: 基于排名的荣誉称号

## 🎮 添加新游戏

使用我们的模板系统，只需 **1-2 小时** 即可添加新游戏！

详细步骤请参考：[游戏开发模板指南](./GAME_TEMPLATE_GUIDE.md)

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

## 📝 许可证

MIT License

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

---

**Happy Gaming! 🎉**