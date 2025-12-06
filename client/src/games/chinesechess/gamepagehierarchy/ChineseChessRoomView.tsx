'use client';

import { GameRoomView } from '@/gamecore/hierarchy/GameRoomView';
import { ChineseChessRoomClient } from './ChineseChessRoomClient';
import dynamic from 'next/dynamic';

const ChineseChessMatchView = dynamic(() => import('./ChineseChessMatchView'), {
    loading: () => <div className="flex justify-center items-center h-full">Loading Game...</div>,
    ssr: false
});

interface ChineseChessRoomViewProps {
    roomClient: ChineseChessRoomClient;
    onBack: () => void;
}

/**
 * 中国象棋游戏房间视图
 * 这是一个简单的包装组件，将通用的 GameRoomView 与中国象棋的 RoomClient 和 MatchView 连接
 */
export function ChineseChessRoomView({ roomClient, onBack }: ChineseChessRoomViewProps) {
    console.log('[ChineseChessRoomView] Rendering, ChineseChessMatchView:', ChineseChessMatchView);
    return (
        <GameRoomView
            roomClient={roomClient}
            onBack={onBack}
            MatchView={ChineseChessMatchView}
        />
    );
}
