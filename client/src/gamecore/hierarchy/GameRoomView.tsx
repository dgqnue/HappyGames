'use client';

import { useEffect, useState } from 'react';
import { GameRoomClient } from './GameRoomClient';
import { GameTableView } from './GameTableView';

interface GameRoomViewProps {
    roomClient: GameRoomClient;
    onBack: () => void;
    MatchView?: React.ComponentType<any>;
}

export function GameRoomView({ roomClient, onBack, MatchView }: GameRoomViewProps) {
    const [roomState, setRoomState] = useState(roomClient.getState());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let hasReceivedData = false;

        roomClient.init((state) => {
            console.log('[GameRoomView] Room state update:', state);
            setRoomState(state);
            if (!hasReceivedData) {
                hasReceivedData = true;
                setIsLoading(false);
            }
        });

        const initialState = roomClient.getState();
        console.log('[GameRoomView] Initial room state:', initialState);
        setRoomState(initialState);

        const timeout = setTimeout(() => {
            setIsLoading(false);
        }, 3000);

        return () => {
            clearTimeout(timeout);
        };
    }, [roomClient]);

    const tableClient = roomClient.getTableClient();
    const myTableId = roomState.selectedTableId;

    useEffect(() => {
        if (!tableClient) return;

        const handleStateUpdate = (state: any) => {
            console.log('[GameRoomView] tableClient state update:', state.status);
            if (state.status === 'playing') {
                console.log('[GameRoomView] Game is now playing, forcing re-render');
                setRoomState(prev => ({ ...prev, _timestamp: Date.now() }));
            }
        };

        const initialState = tableClient.getState();
        if (initialState.status === 'playing') {
            console.log('[GameRoomView] Initial table state is playing');
            setRoomState(prev => ({ ...prev, _timestamp: Date.now() }));
        }

        tableClient.init(handleStateUpdate);

        return () => {
            // cleanup handled internally
        };
    }, [tableClient]);

    // 检查游戏是否开始 - 如果游戏状态为 'playing'，则显示游戏界面
    let shouldShowGame = false;
    if (myTableId) {
        console.log(`[GameRoomView] Checking game status for myTableId: ${myTableId}`);
        
        // 优先从 roomState.tables 中查找状态（通过 table_update 事件）
        if (roomState.tables && roomState.tables.length > 0) {
            const myTable = roomState.tables.find((t: any) => t.tableId === myTableId);
            console.log(`[GameRoomView] Found table in roomState.tables:`, myTable);
            if (myTable && myTable.status === 'playing') {
                shouldShowGame = true;
                console.log('[GameRoomView] ✓ Game starting - detected from roomState.tables');
            } else if (myTable) {
                console.log(`[GameRoomView] Table found but status is ${myTable.status}, not playing yet`);
            }
        } else {
            console.log(`[GameRoomView] roomState.tables is empty or not available`);
        }
        
        // 或者从 tableClient 的状态查找（备选方案）
        if (!shouldShowGame && tableClient) {
            const tableState = tableClient.getState();
            console.log(`[GameRoomView] Checking tableClient status:`, tableState.status);
            if (tableState.status === 'playing') {
                shouldShowGame = true;
                console.log('[GameRoomView] ✓ Game starting - detected from tableClient');
            }
        }
    }

    // 如果游戏已开始，显示游戏界面
    if (shouldShowGame && myTableId && tableClient) {
        const matchClient = tableClient.getMatchClient();
        console.log('[GameRoomView] Showing game - matchClient:', !!matchClient);
        
        if (MatchView) {
            if (matchClient) {
                console.log('[GameRoomView] Rendering MatchView with matchClient');
                return (
                    <MatchView
                        matchClient={matchClient}
                        onBack={() => {
                            roomClient.deselectTable();
                        }}
                    />
                );
            } else {
                console.log('[GameRoomView] Game started, waiting for matchClient...');
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
                                MatchView component not loaded, please refresh
                            </div>
                        </div>
                    </div>
                </main>
            );
        }
    }

    // 显示游戏室 - 房间列表，包含所有表格
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

                {/* Game table list */}
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
