'use client';

import { useEffect } from 'react';

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
    // 类型对应的颜色配置
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

    if (!isOpen) return null;

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
