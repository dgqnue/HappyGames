'use client';

import { useEffect } from 'react';
import { GameRoomView } from '@/gamecore/hierarchy/GameRoomView';
import { registerGameDisplayPlugin } from '@/gamecore/hierarchy/GameDisplayPlugin';
import { ChineseChessRoomClient } from './ChineseChessRoomClient';
import { ChineseChessDisplayPlugin } from './ChineseChessDisplayPlugin';
import { useSystemDialog } from '@/lib/SystemDialogContext';

interface ChineseChessRoomViewProps {
    roomClient: ChineseChessRoomClient;
    onBack: () => void;
}

/**
 * 中国象棋游戏房间视图
 * 这是一个简单的包装组件，将通用的 GameRoomView 与中国象棋的 RoomClient 和显示插件连接
 */
export function ChineseChessRoomView({ roomClient, onBack }: ChineseChessRoomViewProps) {
    const { showError } = useSystemDialog();

    // 在挂载时立即注册插件，不依赖状态
    useEffect(() => {
        console.log('[ChineseChessRoomView] 📝 Registering ChineseChessDisplayPlugin...');
        const registeredPlugin = registerGameDisplayPlugin(ChineseChessDisplayPlugin);
        console.log('[ChineseChessRoomView] ✅ Plugin registered successfully:', registeredPlugin);
        
        // 不需要清理函数 - 插件应该全局保持注册状态
        return undefined;
    }, []); // 空依赖数组确保只运行一次

    // 监听加入失败事件
    useEffect(() => {
        const socket = roomClient.getSocket();
        
        const handleJoinFailed = (data: any) => {
            console.log('[ChineseChessRoomView] join_failed received:', data);
            const message = data?.message || '加入失败';
            showError('无法入座', message);
        };

        socket.on('join_failed', handleJoinFailed);

        return () => {
            socket.off('join_failed', handleJoinFailed);
        };
    }, [roomClient, showError]);

    return (
        <GameRoomView
            roomClient={roomClient}
            onBack={onBack}
        />
    );
}
