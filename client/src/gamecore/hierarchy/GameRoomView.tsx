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

    // 检查是否正在游戏中（已入座且游戏已开始）
    const tableClient = roomClient.getTableClient();
    const myTableId = roomState.selectedTableId;

    // 监听 tableClient 的状态变化，强制刷新组件
    useEffect(() => {
        if (!tableClient) return;

        const handleStateUpdate = (state: any) => {
            console.log('[GameRoomView] tableClient state update:', state.status);
            // 当状态变为playing时，强制重新渲染整个组件
            if (state.status === 'playing') {
                console.log('[GameRoomView] Direct state update detected playing, forcing re-render');
                // 通过更新一个时间戳来确保重新渲染
                setRoomState(prev => ({ ...prev, _timestamp: Date.now() }));
            }
        };

        // 立即检查一次当前状态
        const initialState = tableClient.getState();
        if (initialState.status === 'playing') {
            console.log('[GameRoomView] Initial table state is playing, forcing re-render');
            setRoomState(prev => ({ ...prev, _timestamp: Date.now() }));
        }

        // 订阅tableClient的状态更新
        tableClient.init(handleStateUpdate);

        return () => {
            // 清理：当tableClient变化或组件卸载时，tableClient内部会处理回调的清理
        };
    }, [tableClient]);

    // 额外的检查：当myTableId变化时，确保tableClient被正确设置
    useEffect(() => {
        if (myTableId && tableClient) {
            const tableState = tableClient.getState();
            console.log('[GameRoomView] Table state after myTableId change:', tableState);
            if (tableState.status === 'playing') {
                console.log('[GameRoomView] Table is already playing, forcing re-render');
                setRoomState(prev => ({ ...prev }));
            }
        }
    }, [myTableId, tableClient]);

    // 调试日志
    console.log('[GameRoomView] 当前状态:', {
        myTableId,
        hasTableClient: !!tableClient,
        roomState: roomState,
        roomStateStatus: roomState.status,
        tableClientStatus: tableClient ? tableClient.getState().status : 'no tableClient',
        MatchView: !!MatchView,
        MatchViewComponent: MatchView
    });

    if (tableClient) {
        const tableState = tableClient.getState();
        console.log('[GameRoomView] tableClient状态:', tableState);
        console.log('[GameRoomView] tableClient matchClient:', tableClient.getMatchClient());
        console.log('[GameRoomView] tableState.matchClient:', tableState.matchClient);
    }

    // 如果游戏已开始且我在桌上，显示全屏对局视图
    if (myTableId && tableClient) {
        const tableState = tableClient.getState();
        console.log('[GameRoomView] 检查跳转条件:', {
            tableStateStatus: tableState.status,
            hasMatchClient: !!tableState.matchClient,
            matchClient: tableClient.getMatchClient(),
            myTableId,
            hasMatchView: !!MatchView,
            MatchViewType: typeof MatchView,
            tableState
        });

        // 检查游戏是否已开始（状态为playing）
        if (tableState.status === 'playing') {
            console.log('[GameRoomView] 游戏状态为playing，准备跳转');
            
            // 强制等待一小段时间，确保matchClient已创建
            const matchClient = tableClient.getMatchClient();
            console.log('[GameRoomView] matchClient:', matchClient);
            
            if (MatchView) {
                if (matchClient) {
                    console.log('[GameRoomView] Rendering MatchView with matchClient...');
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
                    // 如果游戏已开始但matchClient未准备好，显示加载界面
                    console.log('[GameRoomView] 游戏已开始，等待matchClient...');
                    return (
                        <main className="min-h-screen bg-amber-50 p-4 md:p-8">
                            <div className="max-w-7xl mx-auto">
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
                                        <span className="text-4xl">🏠</span> 游戏加载中...
                                    </h1>
                                </div>
                                <div className="flex justify-center items-center h-96">
                                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-gray-800"></div>
                                    <div className="ml-4 text-gray-600">
                                        正在初始化游戏对局...
                                    </div>
                                </div>
                            </div>
                        </main>
                    );
                }
            } else {
                console.error('[GameRoomView] MatchView is not provided!');
                // MatchView未提供，显示错误信息
                return (
                    <main className="min-h-screen bg-amber-50 p-4 md:p-8">
                        <div className="max-w-7xl mx-auto">
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
                                    <span className="text-4xl">🏠</span> 游戏错误
                                </h1>
                            </div>
                            <div className="flex justify-center items-center h-96">
                                <div className="text-red-500 text-lg">
                                    MatchView组件未加载，请刷新页面重试
                                </div>
                            </div>
                        </div>
                    </main>
                );
            }
        } else {
            console.log('[GameRoomView] 游戏尚未开始，当前状态:', tableState.status, '等待状态变为playing...');
        }
    } else {
        console.log('[GameRoomView] 缺少跳转条件:', {
            myTableId,
            hasTableClient: !!tableClient,
            hasMatchView: !!MatchView,
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
