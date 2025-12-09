/**
 * 根布局组件 (RootLayout)
 * 
 * 这是整个应用的根布局文件，在 Next.js App Router 架构中具有特殊地位。
 * 
 * 主要职责：
 * 1. HTML 结构定义：
 *    - 提供整个应用的 <html> 和 <body> 标签
 *    - 所有页面都会被这个布局包裹
 * 
 * 2. 全局配置：
 *    - 设置全局字体（Inter）
 *    - 引入全局样式表（globals.css）
 *    - 定义 SEO 元数据（title, description, viewport）
 * 
 * 3. 全局 Provider：
 *    - LanguageProvider：为整个应用提供多语言支持
 *    - 未来可以在这里添加其他全局 Provider（如主题、状态管理等）
 * 
 * 注意：
 * - 此文件必须位于 app/ 目录下，不能移动
 * - 此文件是服务器组件（默认），但可以包裹客户端组件
 * - {children} 会被替换为当前路由对应的页面内容
 */

import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/lib/i18n';
import { SystemDialogProvider } from '@/lib/SystemDialogContext';
import { SystemDialogGlobalBridge } from '@/components/SystemDialogGlobalBridge';

// 移除 Google 字体以避免构建时的网络超时问题
// 在 globals.css 中使用系统字体栈

// 导出全局元数据，用于 SEO 优化
export const metadata: Metadata = {
    title: 'HappyGames - Joyful Gaming Platform',
    description: 'Play games, earn Happy Beans, and win Pi!',
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

/**
 * 根布局组件
 * @param children - 当前路由对应的页面内容（如 LandingPage、LobbyDashboard 等）
 */
export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>
                {/* 系统对话框 Provider，为整个应用提供全局对话框功能 */}
                <SystemDialogProvider>
                    {/* 
                        系统对话框全局桥接器
                        作用：将 React 的对话框功能暴露给非 React 代码（如 GameTableClient）
                        必须在 SystemDialogProvider 内部，确保在应用启动时立即设置
                    */}
                    <SystemDialogGlobalBridge />
                    {/* 多语言 Provider，为所有子组件提供语言切换功能 */}
                    <LanguageProvider>
                        {children}
                    </LanguageProvider>
                </SystemDialogProvider>
            </body>
        </html>
    )
}
