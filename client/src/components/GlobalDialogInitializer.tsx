'use client';

import { useEffect } from 'react';
import { useSystemDialog } from '@/lib/SystemDialogContext';
import { setGlobalDialogHandler } from '@/gamecore/hierarchy/GameTableClient';

/**
 * 全局对话框初始化器
 * 
 * 这个组件在应用启动时立即设置全局对话框处理器，
 * 确保在任何 TableClient 创建之前就已经可用。
 */
export function GlobalDialogInitializer() {
    const { showError, showSuccess, showWarning, showInfo } = useSystemDialog();

    useEffect(() => {
        console.log('[GlobalDialogInitializer] Setting up global dialog handler');
        
        setGlobalDialogHandler({
            showError,
            showSuccess,
            showWarning,
            showInfo
        });
        
        console.log('[GlobalDialogInitializer] Global dialog handler set successfully');
    }, [showError, showSuccess, showWarning, showInfo]);

    // 这个组件不渲染任何内容
    return null;
}
