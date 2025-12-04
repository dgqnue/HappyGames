'use client';

import { useEffect, useState } from 'react';
import { ChineseChessRoomClient } from './gamepagehierarchy/ChineseChessRoomClient';
import { ChineseChessTableView } from './ChineseChessTableView';

interface ChineseChessRoomViewProps {
    roomClient: ChineseChessRoomClient;
    onBack: () => void;
}

export function ChineseChessRoomView({ roomClient, onBack }: ChineseChessRoomViewProps) {
    const [roomState, setRoomState] = useState(roomClient.getState());

    useEffect(() => {
        // 订阅状态更新
        roomClient.init((state) => {
            setRoomState(state);
        });

        // 获取初始状态
        setRoomState(roomClient.getState());
    }, [roomClient]);

    // 如果选择了游戏桌，显示游戏桌视图
    const tableClient = roomClient.getChessTableClient();
    if (roomState.selectedTableId && tableClient) {
        return (
            <ChineseChessTableView
                tableClient={tableClient}
                onBack={() => roomClient.deselectTable()}
            />
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4 md:p-8">
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
                    <h1 className="text-2xl font-bold text-amber-900">
                        {roomState.currentRoom?.name || '游戏房间'}
                    </h1>
                </div>

                {/* 游戏桌列表 */}
                <div className="bg-white rounded-2xl p-8 shadow-xl">
                    <h2 className="text-xl text-gray-600 mb-6 text-center font-medium">选择游戏桌</h2>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {roomState.tables && roomState.tables.length > 0 ? (
                            roomState.tables.map((table: any) => {
                                // 根据 MatchPlayers.js 中的 TABLE_STATUS 定义
                                const status = table.status || 'idle';
                                const isIdle = status === 'idle';
                                const isWaiting = status === 'waiting';
                                const isMatching = status === 'matching';
                                const isPlaying = status === 'playing';

                                // 确定是否可以加入（只有空闲或等待中的桌子可以加入）
                                const playerCount = table.playerCount || 0;
                                const maxPlayers = table.maxPlayers || 2;
                                const canJoin = (isIdle || isWaiting) && playerCount < maxPlayers;

                                return (
                                    <div
                                        key={table.tableId}
                                        onClick={() => canJoin && roomClient.selectTable(table.tableId)}
                                        className={`relative border-2 rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-all ${!canJoin
                                                ? 'border-gray-300 bg-gray-50 cursor-not-allowed opacity-70'
                                                : 'cursor-pointer hover:shadow-lg hover:scale-105'
                                            } ${isPlaying
                                                ? 'border-red-400 bg-gradient-to-br from-red-50 to-red-100'
                                                : isMatching
                                                    ? 'border-purple-400 bg-gradient-to-br from-purple-50 to-purple-100'
                                                    : isWaiting
                                                        ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100'
                                                        : 'border-green-400 bg-gradient-to-br from-green-50 to-green-100'
                                            }`}
                                    >
                                        {/* 图标 */}
                                        <div className="text-5xl mb-2">
                                            {isPlaying ? '⚔️' : isMatching ? '⏳' : isWaiting ? '👥' : '♟️'}
                                        </div>

                                        {/* 桌号 */}
                                        <div className="font-bold text-lg text-gray-800">
                                            {table.tableId}
                                        </div>

                                        {/* 状态标签 */}
                                        <div className={`text-xs px-3 py-1 rounded-full font-bold ${isPlaying
                                                ? 'bg-red-200 text-red-700'
                                                : isMatching
                                                    ? 'bg-purple-200 text-purple-700'
                                                    : isWaiting
                                                        ? 'bg-amber-200 text-amber-700'
                                                        : 'bg-green-200 text-green-700'
                                            }`}>
                                            {isPlaying ? '游戏中' : isMatching ? '匹配中' : isWaiting ? '等待中' : '空闲'}
                                        </div>

                                        {/* 人数 */}
                                        <div className="text-sm font-medium text-gray-600">
                                            {playerCount}/{maxPlayers} 人
                                        </div>

                                        {/* 底豆信息（如果有） */}
                                        {table.baseBet && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                底豆: {table.baseBet}
                                            </div>
                                        )}

                                        {/* 不可加入提示 */}
                                        {!canJoin && (isPlaying || isMatching) && (
                                            <div className="absolute top-2 right-2">
                                                <div className="bg-gray-700 text-white text-xs px-2 py-1 rounded">
                                                    🔒
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="col-span-full text-center py-16 text-gray-400">
                                <div className="text-6xl mb-4">📭</div>
                                <p className="text-lg">暂无游戏桌，请稍候...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
