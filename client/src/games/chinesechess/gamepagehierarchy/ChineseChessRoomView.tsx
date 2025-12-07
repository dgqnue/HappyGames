'use client';

import { useEffect } from 'react';
import { GameRoomView } from '@/gamecore/hierarchy/GameRoomView';
import { registerGameDisplayPlugin } from '@/gamecore/hierarchy/GameDisplayPlugin';
import { ChineseChessRoomClient } from './ChineseChessRoomClient';
import { ChineseChessDisplayPlugin } from './ChineseChessDisplayPlugin';

interface ChineseChessRoomViewProps {
    roomClient: ChineseChessRoomClient;
    onBack: () => void;
}

/**
 * 中国象棋游戏房间视图
 * 这是一个简单的包装组件，将通用的 GameRoomView 与中国象棋的 RoomClient 和显示插件连接
 */
export function ChineseChessRoomView({ roomClient, onBack }: ChineseChessRoomViewProps) {
    // 在挂载时立即注册插件，不依赖状态
    useEffect(() => {
        console.log('[ChineseChessRoomView] 📝 Registering ChineseChessDisplayPlugin...');
        const registeredPlugin = registerGameDisplayPlugin(ChineseChessDisplayPlugin);
        console.log('[ChineseChessRoomView] ✅ Plugin registered successfully:', registeredPlugin);
        
        // 不需要清理函数 - 插件应该全局保持注册状态
        return undefined;
    }, []); // 空依赖数组确保只运行一次

    return (
        <GameRoomView
            roomClient={roomClient}
            onBack={onBack}
        />
    );
}
