'use client';

/**
 * 系统对话框全局桥接器 (SystemDialogGlobalBridge)
 * 
 * 这是全局对话框系统的"桥接层"，负责将 React 的对话框功能暴露给非 React 代码使用。
 * 
 * 问题背景：
 * - GameTableClient 是普通的 TypeScript 类（非 React 组件）
 * - 它无法直接使用 React hooks（如 useSystemDialog）
 * - 但它需要在事件处理中显示对话框（如 join_failed）
 * 
 * 解决方案：
 * 1. 在应用启动时，通过这个组件获取 React Context 中的对话框函数
 * 2. 将这些函数存储为全局变量（通过 setGlobalDialogHandler）
 * 3. GameTableClient 可以通过 getGlobalDialogHandler() 访问这些函数
 * 
 * 职责：
 * - 从 useSystemDialog hook 获取对话框函数（showError、showSuccess 等）
 * - 调用 setGlobalDialogHandler 将这些函数设置为全局可访问
 * - 确保在任何游戏组件加载之前就完成初始化
 * 
 * 使用位置：
 * - 在根布局（layout.tsx）的 SystemDialogProvider 内部
 * - 作为应用的第一批初始化组件之一
 * 
 * 与 SystemDialog 的关系：
 * - SystemDialog: UI 层，负责"如何显示"对话框
 * - SystemDialogGlobalBridge: 桥接层，负责"谁能调用"对话框
 * - SystemDialogContext: 数据层，负责"管理状态"
 * 
 * 数据流向：
 * GameTableClient → getGlobalDialogHandler() → showError() 
 *   → SystemDialogContext.showError() → setState → SystemDialog 渲染
 * 
 * 注意：
 * - 这个组件不渲染任何 UI（return null）
 * - 它的唯一作用是建立 React 和非 React 代码之间的桥梁
 * - 必须在 SystemDialogProvider 内部才能工作（需要 Context）
 */

import { useEffect } from 'react';
import { useSystemDialog } from '@/lib/SystemDialogContext';
import { setGlobalDialogHandler } from '@/gamecore/hierarchy/GameTableClient';

export function SystemDialogGlobalBridge() {
    // 从 React Context 获取对话框函数
    const { showError, showSuccess, showWarning, showInfo } = useSystemDialog();

    useEffect(() => {
        /**
         * 将 React 的对话框函数注册为全局处理器
         * 这样 GameTableClient 等非 React 类就可以通过
         * getGlobalDialogHandler() 来访问这些函数
         */
        setGlobalDialogHandler({
            showError,
            showSuccess,
            showWarning,
            showInfo
        });
    }, [showError, showSuccess, showWarning, showInfo]); // 当对话框函数变化时重新设置

    /**
     * 这个组件不渲染任何 UI
     * 它是一个"幕后工作者"，只负责初始化全局状态
     */
    return null;
}
