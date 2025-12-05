'use client';

import { useEffect, useState } from 'react';
import { GameRoomClient } from './GameRoomClient';
import { GameTableView } from './GameTableView';

interface GameRoomViewProps {
    roomClient: GameRoomClient;
    onBack: () => void;
    MatchView?: React.ComponentType<any>; // 可选的对局视图组件
}

export function GameRoomView({ roomClient, onBack, MatchView }: GameRoomViewProps) {
    const [roomState, setRoomState] = useState(roomClient.getState());

    useEffect(() => {
        // 订阅状态更新
        roomClient.init((state) => {
            setRoomState(state);
        });

        // 获取初始状态
        setRoomState(roomClient.getState());
    }, [roomClient]);

    // 检查是否正在游戏中（已入座且游戏已开始）
    const tableClient = roomClient.getTableClient();
    const myTableId = roomState.selectedTableId;
    const myTable = roomState.tables?.find((t: any) => t.tableId === myTableId);

    // 如果游戏已开始且我在桌上，显示全屏对局视图
    if (myTableId && myTable?.status === 'playing' && tableClient && MatchView) {
        const matchClient = tableClient.getMatchClient();
        if (matchClient) {
            return (
                <MatchView
                    matchClient={matchClient}
                    onBack={() => {
                        // 游戏结束或强制离开时返回
                        roomClient.deselectTable();
                    }}
                />
            );
        }
    }

    return (
        <main className="min-h-screen bg-amber-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={onBack}
                        className="p-2 bg-white rounded-full shadow-md hover:bg-amber-100 transition-colors"
                    >
                        <svg className="w-6 h-6 text-amber-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <h1 className="text-3xl font-bold text-amber-900 flex items-center gap-3">
                        <span className="text-4xl">🏠</span> {roomState.currentRoom?.name || '游戏房间'}
                    </h1>
                </div>

                {/* 游戏桌列表 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {roomState.tables && roomState.tables.length > 0 ? (
                        roomState.tables.map((table: any) => (
                            <GameTableView
                                key={table.tableId}
                                table={table}
                                roomClient={roomClient}
                                isMyTable={table.tableId === myTableId}
                            />
                        ))
                    ) : (
                        <div className="col-span-full flex justify-center py-20">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-gray-800"></div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
