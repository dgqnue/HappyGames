'use client';

import { GameMatchView } from '@/gamecore/hierarchy/GameMatchView';
import { ChineseChessMatchClient } from './gamepagehierarchy/ChineseChessMatchClient';

interface ChineseChessMatchViewProps {
    matchClient: ChineseChessMatchClient;
    onBack: () => void;
}

/**
 * 中国象棋对局视图
 * 这是一个简单的包装组件，将通用的 GameMatchView 与中国象棋的 MatchClient 连接
 */
export function ChineseChessMatchView({ matchClient, onBack }: ChineseChessMatchViewProps) {
    return <GameMatchView matchClient={matchClient} onBack={onBack} />;
}
