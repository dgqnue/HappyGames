'use client';

import { GameTableView } from '@/gamecore/hierarchy/GameTableView';
import { ChineseChessRoomClient } from './ChineseChessRoomClient';

interface ChineseChessTableViewProps {
    table: any;
    roomClient: ChineseChessRoomClient;
    isMyTable: boolean;
}

/**
 * 中国象棋游戏桌视图
 * 这是一个简单的包装组件，将通用的 GameTableView 与中国象棋的 RoomClient 连接
 */
export function ChineseChessTableView({ table, roomClient, isMyTable }: ChineseChessTableViewProps) {
    return (
        <GameTableView
            table={table}
            roomClient={roomClient}
            isMyTable={isMyTable}
        />
    );
}
