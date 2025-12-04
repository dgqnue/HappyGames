/**
 * 游戏大厅路由组件 (LobbyPage)
 * 
 * 路径: /lobby
 * 
 * 这是游戏大厅的页面入口。
 * 它主要负责渲染 LobbyDashboard 组件，该组件包含了大厅的所有核心功能（游戏列表、轮播图、动态Feed等）。
 * 
 * 结构：
 * - main: 页面主容器，设置了最小高度和内边距。
 * - LobbyDashboard: 核心业务组件。
 */

import LobbyDashboard from './LobbyDashboard';

export default function LobbyPage() {
    return (
        <main className="min-h-screen p-4 md:p-8 relative">
            <LobbyDashboard />
        </main>
    );
}
