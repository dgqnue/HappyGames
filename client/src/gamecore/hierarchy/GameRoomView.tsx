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
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let hasReceivedData = false;

        // 订阅状态更新
        roomClient.init((state) => {
            console.log('[GameRoomView] 房间状态更新:', state);
            setRoomState(state);
            // 只在第一次收到数据时设置为加载完成
            if (!hasReceivedData) {
                hasReceivedData = true;
                setIsLoading(false);
            }
        });

        // 获取初始状态
        const initialState = roomClient.getState();
        console.log('[GameRoomView] 初始房间状态:', initialState);
        setRoomState(initialState);

        // 设置超时，最多加载3秒
        const timeout = setTimeout(() => {
            setIsLoading(false);
        }, 3000);

        return () => {
            clearTimeout(timeout);
        };
    }, [roomClient]);

    // 监听 tableClient 的状态变化，强制刷新组件
    useEffect(() => {
        const checkTableStatus = () => {
            const currentTableClient = roomClient.getTableClient();
            if (currentTableClient) {
                const state = currentTableClient.getState();
                // 如果状态是 playing 且有 matchClient，强制刷新以触发跳转
                if (state.status === 'playing' && state.matchClient) {
                    setRoomState(prev => ({ ...prev }));
                }
            }
        };

        const interval = setInterval(checkTableStatus, 500);
        return () => clearInterval(interval);
    }, [roomClient, roomState.selectedTableId]);

    // 检查是否正在游戏中（已入座且游戏已开始）
    const tableClient = roomClient.getTableClient();
    const myTableId = roomState.selectedTableId;

    // 调试日志
    console.log('[GameRoomView] 当前状态:', {
        myTableId,
        hasTableClient: !!tableClient,
        roomState: roomState,
        roomStateStatus: roomState.status,
        tableClientStatus: tableClient ? tableClient.getState().status : 'no tableClient',
        MatchView: !!MatchView
    });

    if (tableClient) {
        const tableState = tableClient.getState();
        console.log('[GameRoomView] tableClient状态:', tableState);
    }

    // 如果游戏已开始且我在桌上，显示全屏对局视图
    if (myTableId && tableClient) {
        const tableState = tableClient.getState();
        console.log('[GameRoomView] 检查跳转条件:', {
            tableStateStatus: tableState.status,
            hasMatchClient: !!tableState.matchClient,
            myTableId,
            hasMatchView: !!MatchView,
            MatchViewType: typeof MatchView
        });

        if (tableState.status === 'playing') {
            const matchClient = tableClient.getMatchClient();
            console.log('[GameRoomView] 游戏开始，跳转到对局页面，matchClient:', matchClient);
            if (matchClient && MatchView) {
                console.log('[GameRoomView] Rendering MatchView...');
                return (
                    <MatchView
                        matchClient={matchClient}
                        onBack={() => {
                            // 游戏结束或强制离开时返回
                            roomClient.deselectTable();
                        }}
                    />
                );
            } else {
                console.log('[GameRoomView] matchClient or MatchView is null/undefined', { matchClient: !!matchClient, MatchView: !!MatchView });
            }
        } else {
            console.log('[GameRoomView] 游戏尚未开始，当前状态:', tableState.status);
        }
    } else if (myTableId) {
        console.log('[GameRoomView] 缺少跳转条件:', {
            hasTableClient: !!tableClient,
            hasMatchView: !!MatchView,
            myTableId
        });
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
                    {isLoading ? (
                        <div className="col-span-full flex justify-center py-20">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-gray-800"></div>
                        </div>
                    ) : roomState.tables && roomState.tables.length > 0 ? (
                        roomState.tables.map((table: any) => (
                            <GameTableView
                                key={table.tableId}
                                table={table}
                                roomClient={roomClient}
                                isMyTable={table.tableId === myTableId}
                            />
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20 text-gray-500">
                            <p className="text-lg">暂无游戏桌</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
