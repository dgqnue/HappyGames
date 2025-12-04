/**
 * 首页路由组件 (HomePage)
 * 
 * 路径: /
 * 
 * 这是应用的主页路由入口。它主要负责渲染 HomePage 组件。
 * 由于 HomePage 是一个客户端组件（包含交互逻辑），这里将其作为默认导出。
 * 
 * 注意：
 * - 本文件是服务器组件（默认），但渲染了客户端组件 HomePage。
 * - 所有的交互逻辑（登录、注册等）都封装在 HomePage 中。
 */

import HomePage from './HomePage';

export default function Page() {
    return <HomePage />;
}
