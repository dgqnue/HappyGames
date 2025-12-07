'use client';

import { useEffect } from 'react';
import { GameRoomView } from '@/gamecore/hierarchy/GameRoomView';
import { registerGameDisplayPlugin } from '@/gamecore/hierarchy/GameDisplayPlugin';
import { ChineseChessRoomClient } from './ChineseChessRoomClient';
import { ChineseChessDisplayPlugin } from './ChineseChessDisplayPlugin';

// 在组件级别注册插件（只执行一次）
let isRegistered = false;

interface ChineseChessRoomViewProps {
    roomClient: ChineseChessRoomClient;
    onBack: () => void;
}

/**
 * 中国象棋游戏房间视图
 * 这是一个简单的包装组件，将通用的 GameRoomView 与中国象棋的 RoomClient 和显示插件连接
 */
export function ChineseChessRoomView({ roomClient, onBack }: ChineseChessRoomViewProps) {
    // 注册中国象棋显示插件
    useEffect(() => {
        if (!isRegistered) {
            registerGameDisplayPlugin(ChineseChessDisplayPlugin);
            isRegistered = true;
        }
    }, []);

    return (
        <GameRoomView
            roomClient={roomClient}
            onBack={onBack}
        />
    );
}
