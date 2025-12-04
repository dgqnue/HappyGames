/**
 * 用户个人中心路由组件 (ProfilePage)
 * 
 * 路径: /profile
 * 
 * 这是用户个人资料页面的入口。
 * 它主要负责渲染 UserProfile 组件，该组件展示了用户的详细信息、游戏战绩、钱包管理和推荐系统。
 * 
 * 结构：
 * - main: 页面主容器，设置了最小高度和顶部内边距（避开顶部导航栏）。
 * - UserProfile: 核心业务组件。
 */

import UserProfile from './UserProfile';

export default function ProfilePage() {
    return (
        <main className="min-h-screen p-8 pt-24">
            <UserProfile />
        </main>
    );
}
