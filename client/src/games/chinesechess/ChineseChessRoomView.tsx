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
                    <h1 className="text-2xl font-bold text-amber-900">
                        {roomState.currentRoom?.name || '游戏房间'}
                    </h1>
                </div>

                {/* 游戏桌列表 */}
                <div className="bg-white rounded-2xl p-8 shadow-lg">
                    <h2 className="text-xl text-gray-600 mb-6 text-center">选择游戏桌</h2>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {roomState.tables && roomState.tables.length > 0 ? (
                            roomState.tables.map((table: any) => (
                                <div
                                    key={table.tableId}
                                    onClick={() => roomClient.selectTable(table.tableId)}
                                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${table.status === 'playing'
                                            ? 'border-red-300 bg-red-50 hover:border-red-400 hover:shadow-md'
                                            : table.playerCount > 0
                                                ? 'border-amber-300 bg-amber-50 hover:border-amber-400 hover:shadow-md'
                                                : 'border-gray-300 hover:border-amber-400 hover:bg-amber-50 hover:shadow-md'
                                        }`}
                                >
                                    {/* 图标 */}
                                    <div className="text-4xl">
                                        {table.status === 'playing' ? '⚔️' : table.playerCount > 0 ? '👥' : '♟️'}
                                    </div>

                                    {/* 桌号 */}
                                    <div className="font-bold text-gray-800">
                                        {table.tableId}
                                    </div>

                                    {/* 状态标签 */}
                                    <div className={`text-xs px-3 py-1 rounded-full font-medium ${table.status === 'playing'
                                            ? 'bg-red-100 text-red-600'
                                            : table.playerCount > 0
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-green-100 text-green-600'
                                        }`}>
                                        {table.status === 'playing' ? '游戏中' : table.playerCount > 0 ? '等待中' : '空闲'}
                                    </div>

                                    {/* 人数 */}
                                    <div className="text-xs text-gray-500">
                                        {table.playerCount || 0}/{table.maxPlayers || 2} 人
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-12 text-gray-400">
                                <div className="text-5xl mb-3">📭</div>
                                <p>暂无游戏桌，请稍候...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
