'use client';

/**
 * 系统对话框 UI 组件 (SystemDialog - UI Layer)
 * 
 * 这是全局对话框系统的"UI 呈现层"，负责对话框的视觉展示和用户交互。
 * 
 * 职责：
 * 1. 渲染对话框的 UI（标题、消息、按钮等）
 * 2. 处理用户交互（点击确认/取消、ESC 键关闭、点击遮罩关闭）
 * 3. 根据类型（error/success/warning/info）显示不同的样式和图标
 * 4. 提供动画效果和响应式布局
 * 
 * 使用位置：
 * - 被 SystemDialogContext（数据层）自动渲染
 * - 不需要在其他组件中直接引用
 * 
 * 与其他组件的关系：
 * ┌─────────────────────────────────────────────────────┐
 * │  全局对话框系统三层架构                               │
 * ├─────────────────────────────────────────────────────┤
 * │  1. SystemDialog (本文件)                            │
 * │     └─ UI 层：负责"如何显示"对话框                    │
 * │                                                       │
 * │  2. SystemDialogContext                              │
 * │     └─ 数据层：负责"状态管理"                         │
 * │                                                       │
 * │  3. SystemDialogGlobalBridge                         │
 * │     └─ 桥接层：负责"谁能调用"（React ↔ 非React）     │
 * └─────────────────────────────────────────────────────┘
 * 
 * 数据流向：
 * GameTableClient.handleJoinFailed() 
 *   → getGlobalDialogHandler().showError() [通过桥接层]
 *   → SystemDialogContext.showError() [数据层更新状态]
 *   → SystemDialog 重新渲染 [UI 层显示对话框]
 * 
 * 注意：
 * - 这是一个纯 UI 组件，不包含业务逻辑
 * - 对话框的显示/隐藏由 SystemDialogContext 控制
 * - 通过 isOpen 属性控制是否显示
 */

import { useEffect } from 'react';

/**
 * 对话框组件的属性接口
 */
interface SystemDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'error' | 'success';
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    showCancel?: boolean;
    icon?: React.ReactNode;
}

export default function SystemDialog({
    isOpen,
    onClose,
    title,
    message,
    type = 'info',
    confirmText = '确认',
    cancelText = '取消',
    onConfirm,
    onCancel,
    showCancel = true,
    icon
}: SystemDialogProps) {
    /**
     * 不同对话框类型对应的颜色和样式配置
     * - info: 蓝色（信息提示）
     * - warning: 琥珀色（警告）
     * - error: 红色（错误）
     * - success: 绿色（成功）
     */
    const typeConfig = {
        info: {
            bg: 'bg-blue-100',
            iconColor: 'text-blue-500',
            buttonColor: 'bg-blue-500 hover:bg-blue-600',
            shadowColor: 'shadow-blue-500/30'
        },
        warning: {
            bg: 'bg-amber-100',
            iconColor: 'text-amber-500',
            buttonColor: 'bg-amber-500 hover:bg-amber-600',
            shadowColor: 'shadow-amber-500/30'
        },
        error: {
            bg: 'bg-red-100',
            iconColor: 'text-red-500',
            buttonColor: 'bg-red-500 hover:bg-red-600',
            shadowColor: 'shadow-red-500/30'
        },
        success: {
            bg: 'bg-green-100',
            iconColor: 'text-green-500',
            buttonColor: 'bg-green-500 hover:bg-green-600',
            shadowColor: 'shadow-green-500/30'
        }
    };

    const config = typeConfig[type];

    // 默认图标
    const defaultIcon = icon || (
        <div className={`w-12 h-12 ${config.bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {type === 'info' && (
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )}
            {type === 'warning' && (
                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
            )}
            {type === 'error' && (
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )}
            {type === 'success' && (
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )}
        </div>
    );

    // 点击背景关闭
    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // 处理确认
    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        }
        onClose();
    };

    // 处理取消
    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        }
        onClose();
    };

    // ESC键关闭
    useEffect(() => {
        const handleEscKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'hidden'; // 防止背景滚动
        }

        return () => {
            document.removeEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, onClose]);

    // 对话框未打开时不渲染任何内容
    if (!isOpen) return null;

    /**
     * 对话框结构：
     * - 全屏遮罩层（半透明黑色背景 + 模糊效果）
     * - 对话框容器（白色圆角卡片）
     * - 图标（根据类型显示）
     * - 标题和消息
     * - 操作按钮（确认 + 可选的取消按钮）
     */
    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in"
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center transform transition-all scale-100">
                {defaultIcon}
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 mb-6 whitespace-pre-line">{message}</p>
                
                <div className="flex gap-3 justify-center">
                    {showCancel && (
                        <button
                            onClick={handleCancel}
                            className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors flex-1"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={handleConfirm}
                        className={`px-6 py-2 text-white rounded-xl font-bold transition-colors shadow-lg ${config.shadowColor} ${config.buttonColor} flex-1`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
