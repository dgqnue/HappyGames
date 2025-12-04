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
                                    className={`bg-white rounded-2xl p-6 shadow-lg border border-amber-100 transition-all group relative overflow-hidden ${!canJoin
                                            ? 'opacity-70 cursor-not-allowed bg-gray-50'
                                            : 'cursor-pointer hover:shadow-xl hover:scale-[1.02]'
                                        }`}
                                >
                                    {/* 状态标签 */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-colors ${isPlaying ? 'bg-red-100' :
                                                isMatching ? 'bg-purple-100' :
                                                    isWaiting ? 'bg-amber-100' : 'bg-green-100'
                                            }`}>
                                            {isPlaying ? '⚔️' : isMatching ? '⏳' : isWaiting ? '👥' : '♟️'}
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${isPlaying ? 'bg-red-100 text-red-700' :
                                                isMatching ? 'bg-purple-100 text-purple-700' :
                                                    isWaiting ? 'bg-amber-100 text-amber-700' :
                                                        'bg-green-100 text-green-700'
                                            }`}>
                                            {isPlaying ? '游戏中' : isMatching ? '匹配中' : isWaiting ? '等待中' : '空闲'}
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold text-gray-800 mb-1">
                                        {table.tableId}号桌
                                    </h3>

                                    <p className="text-gray-500 text-sm mb-4">
                                        {table.baseBet ? `底豆: ${table.baseBet}` : '标准对局'}
                                    </p>

                                    <div className="flex items-center justify-between text-sm text-gray-400 border-t border-gray-100 pt-4">
                                        <div className="flex items-center gap-1">
                                            <span>👤</span>
                                            <span>{playerCount}/{maxPlayers}</span>
                                        </div>

                                        {canJoin ? (
                                            <div className="text-amber-600 font-medium group-hover:translate-x-1 transition-transform">
                                                入座 &rarr;
                                            </div>
                                        ) : (
                                            <div className="text-gray-400 font-medium">
                                                {isPlaying ? '观战' : '已满'}
                                            </div>
                                        )}
                                    </div>

                                    {/* 锁定遮罩 (针对不可加入的桌子) */}
                                    {!canJoin && (isPlaying || isMatching) && (
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-xl">🔒</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full text-center py-20 text-gray-400">
                            <div className="text-6xl mb-4">📭</div>
                            <p>暂无游戏桌，请稍候...</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
