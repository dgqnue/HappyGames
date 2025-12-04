'use client';

import { useEffect, useState } from 'react';
import { ChineseChessRoomClient } from './gamepagehierarchy/ChineseChessRoomClient';
import { ChineseChessMatchView } from './ChineseChessMatchView';

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

    // 检查是否正在游戏中（已入座且游戏已开始）
    const tableClient = roomClient.getChessTableClient();
    const myTableId = roomState.selectedTableId;
    const myTable = roomState.tables?.find((t: any) => t.tableId === myTableId);

    // 如果游戏已开始且我在桌上，显示全屏对局视图
    if (myTableId && myTable?.status === 'playing' && tableClient) {
        const matchClient = tableClient.getChessMatchClient();
        if (matchClient) {
            return (
                <ChineseChessMatchView
                    matchClient={matchClient}
                    onBack={() => {
                        // 游戏结束或强制离开时返回
                        // 注意：正常游戏结束逻辑应该由 MatchClient 处理
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
                            <GameTableCard
                                key={table.tableId}
                                table={table}
                                roomClient={roomClient}
                                isMyTable={table.tableId === myTableId}
                            />
                        ))
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

// 单个游戏桌卡片组件
function GameTableCard({ table, roomClient, isMyTable }: { table: any, roomClient: ChineseChessRoomClient, isMyTable: boolean }) {
    // 提取纯数字桌号 (例如 "beginner_1" -> "1")
    const displayId = table.tableId.split('_').pop();

    const status = table.status || 'idle';
    const isIdle = status === 'idle';
    const isWaiting = status === 'waiting';
    const isMatching = status === 'matching';
    const isPlaying = status === 'playing';

    const playerCount = table.playerCount || 0;
    const maxPlayers = table.maxPlayers || 2;
    const canJoin = (isIdle || isWaiting) && playerCount < maxPlayers;

    // 如果是我所在的桌子，获取 TableClient 来操作
    const tableClient = isMyTable ? roomClient.getChessTableClient() : null;
    const [isReady, setIsReady] = useState(false);

    // 简单的本地状态同步（实际应从 tableClient 获取）
    useEffect(() => {
        if (tableClient) {
            const state = tableClient.getState();
            setIsReady(state.isReady || false);

            // 订阅更新
            tableClient.init((s) => setIsReady(s.isReady || false));
        }
    }, [tableClient]);

    const handleJoin = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (canJoin) {
            roomClient.selectTable(table.tableId);
        }
    };

    const handleReady = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (tableClient) {
            tableClient.setReady(!isReady);
        }
    };

    const handleLeave = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (tableClient) {
            tableClient.leaveTable();
            roomClient.deselectTable();
        }
    };

    return (
        <div className={`bg-white rounded-2xl p-6 shadow-lg border border-amber-100 transition-all relative overflow-hidden ${isMyTable ? 'ring-4 ring-amber-400 scale-[1.02] z-10' : ''
            }`}>
            {/* 顶部：桌号 + 状态 */}
            <div className="flex justify-between items-start mb-6">
                <h3 className="text-3xl font-bold text-gray-800">
                    {displayId}
                </h3>

                <div className={`px-3 py-1 rounded-full text-xs font-bold ${isPlaying ? 'bg-red-100 text-red-700' :
                        isMatching ? 'bg-purple-100 text-purple-700' :
                            isWaiting ? 'bg-amber-100 text-amber-700' :
                                'bg-green-100 text-green-700'
                    }`}>
                    {isPlaying ? '游戏中' : isMatching ? '匹配中' : isWaiting ? '等待中' : '空闲'}
                </div>
            </div>

            {/* 中间：底豆信息 */}
            <div className="mb-8">
                <p className="text-gray-500 text-sm">
                    {table.baseBet ? `底豆: ${table.baseBet}` : '标准对局'}
                </p>
            </div>

            {/* 底部：操作按钮 + 人数 */}
            <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-1 text-gray-400 text-sm">
                    <span>👤</span>
                    <span>{playerCount}/{maxPlayers}</span>
                </div>

                {isMyTable ? (
                    <div className="flex gap-2">
                        <button
                            onClick={handleLeave}
                            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition-colors text-sm"
                        >
                            离座
                        </button>
                        <button
                            onClick={handleReady}
                            className={`px-6 py-2 rounded-lg font-bold text-white transition-colors shadow-md ${isReady
                                    ? 'bg-green-500 hover:bg-green-600'
                                    : 'bg-amber-500 hover:bg-amber-600'
                                }`}
                        >
                            {isReady ? '已就绪' : '准备'}
                        </button>
                    </div>
                ) : (
                    canJoin ? (
                        <button
                            onClick={handleJoin}
                            className="w-32 py-2 bg-white border-2 border-red-500 text-red-500 rounded-lg font-bold hover:bg-red-50 transition-colors shadow-sm"
                        >
                            入座
                        </button>
                    ) : (
                        <span className="text-gray-400 font-medium px-4 py-2">
                            {isPlaying ? '观战' : '已满'}
                        </span>
                    )
                )}
            </div>

            {/* 自己的标记 */}
            {isMyTable && (
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
            )}
        </div>
    );
}
