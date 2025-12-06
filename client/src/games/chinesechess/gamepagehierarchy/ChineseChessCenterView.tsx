'use client';

import { GameCenterView } from '@/gamecore/hierarchy/GameCenterView';
import { ChineseChessCenterClient } from './ChineseChessCenterClient';

import dynamic from 'next/dynamic';

const ChineseChessMatchView = dynamic(() => import('./ChineseChessMatchView'), {
    loading: () => <div className="flex justify-center items-center h-full">Loading Game...</div>,
    ssr: false
});

interface ChineseChessCenterViewProps {
    centerClient: ChineseChessCenterClient;
    onBack: () => void;
}

/**
 * 中国象棋游戏中心视图
 * 这是一个简单的包装组件，将通用的 GameCenterView 与中国象棋的 CenterClient 连接
 */
export function ChineseChessCenterView({ centerClient, onBack }: ChineseChessCenterViewProps) {
    return (
        <GameCenterView
            centerClient={centerClient}
            onBack={onBack}
            MatchView={ChineseChessMatchView}
        />
    );
}
