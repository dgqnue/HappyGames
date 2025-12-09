'use client';

import { useEffect } from 'react';
import { GameRoomView } from '@/gamecore/hierarchy/GameRoomView';
import { registerGameDisplayPlugin } from '@/gamecore/hierarchy/GameDisplayPlugin';
import { ChineseChessRoomClient } from './ChineseChessRoomClient';
import { ChineseChessDisplayPlugin } from './ChineseChessDisplayPlugin';
import { useSystemDialog } from '@/lib/SystemDialogContext';
import { setGlobalDialogHandler } from '@/gamecore/hierarchy/GameTableClient';

interface ChineseChessRoomViewProps {
    roomClient: ChineseChessRoomClient;
    onBack: () => void;
}

/**
 * 中国象棋游戏房间视图
 * 这是一个简单的包装组件，将通用的 GameRoomView 与中国象棋的 RoomClient 和显示插件连接
 */
export function ChineseChessRoomView({ roomClient, onBack }: ChineseChessRoomViewProps) {
    const { showError, showSuccess, showWarning, showInfo } = useSystemDialog();

    // 注册显示插件和设置全局对话框处理器
    useEffect(() => {
        console.log('[ChineseChessRoomView] 📝 Registering ChineseChessDisplayPlugin...');
        const registeredPlugin = registerGameDisplayPlugin(ChineseChessDisplayPlugin);
        console.log('[ChineseChessRoomView] ✅ Plugin registered successfully:', registeredPlugin);
        
        // 设置全局对话框处理器，供基类 GameTableClient 使用
        console.log('[ChineseChessRoomView] Setting global dialog handler');
        setGlobalDialogHandler({
            showError,
            showSuccess, 
            showWarning,
            showInfo
        });
        
        // 不需要清理函数 - 插件和全局处理器应该保持注册状态
        return undefined;
    }, [showError, showSuccess, showWarning, showInfo]); // 依赖对话框函数以确保处理器是最新的

    // join_failed 事件现在在基类 GameTableClient 中统一处理

    return (
        <GameRoomView
            roomClient={roomClient}
            onBack={onBack}
        />
    );
}
