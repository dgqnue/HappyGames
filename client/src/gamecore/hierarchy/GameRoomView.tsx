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
                console.log('[GameRoomView] Direct state update detected playing');
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

    useEffect(() => {
        if (myTableId && tableClient) {
            const tableState = tableClient.getState();
            console.log('[GameRoomView] Table state after myTableId change:', tableState);
            if (tableState.status === 'playing') {
                console.log('[GameRoomView] Table is already playing');
                setRoomState(prev => ({ ...prev }));
            }
        }
    }, [myTableId, tableClient]);

    // If I joined a table that is not yet playing, show table preparation view
    if (myTableId && roomState.tables && roomState.tables.length > 0) {
        const myTable = roomState.tables.find((t: any) => t.tableId === myTableId);
        if (myTable && myTable.status !== 'playing') {
            return (
                <main className="min-h-screen bg-amber-50 p-4 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center gap-4 mb-8">
                            <button
                                onClick={() => roomClient.deselectTable()}
                                className="p-2 bg-white rounded-full shadow-md hover:bg-amber-100 transition-colors"
                            >
                                <svg className="w-6 h-6 text-amber-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            <h1 className="text-3xl font-bold text-amber-900 flex items-center gap-3">
                                <span className="text-4xl">🏮</span> 准备开始
                            </h1>
                        </div>

                        <div className="flex justify-center">
                            <div style={{ width: '320px' }}>
                                <GameTableView
                                    key={myTable.tableId}
                                    table={myTable}
                                    roomClient={roomClient}
                                    isMyTable={true}
                                />
                            </div>
                        </div>
                    </div>
                </main>
            );
        }
    }

    // 检查是否需要跳转到游戏界面
    // 先检查 roomState.tables 中的状态（通过 table_update 事件），再检查 tableClient 的状态
    let shouldShowGame = false;
    if (myTableId) {
        // 优先从 roomState.tables 中查找状态
        if (roomState.tables && roomState.tables.length > 0) {
            const myTable = roomState.tables.find((t: any) => t.tableId === myTableId);
            if (myTable && myTable.status === 'playing') {
                shouldShowGame = true;
            }
        }
        
        // 或者从 tableClient 的状态查找
        if (!shouldShowGame && tableClient) {
            const tableState = tableClient.getState();
            if (tableState.status === 'playing') {
                shouldShowGame = true;
            }
        }
    }

    // If game has started and I'm on the table, show game view
    if (shouldShowGame && myTableId && tableClient) {
        const tableState = tableClient.getState();
        
        console.log('[GameRoomView] Game should be displayed, tableState:', tableState);
        
        const matchClient = tableClient.getMatchClient();
        console.log('[GameRoomView] matchClient:', matchClient);
        
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
