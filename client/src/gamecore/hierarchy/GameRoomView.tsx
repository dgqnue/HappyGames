'use client';

import { useEffect, useState, useMemo } from 'react';
import { GameRoomClient } from './GameRoomClient';
import { GameTableView } from './GameTableView';

interface GameRoomViewProps {
    roomClient: GameRoomClient;
    onBack: () => void;
}

export function GameRoomView({ roomClient, onBack }: GameRoomViewProps) {
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

    console.log('[GameRoomView] render called, roomState:', roomState);
    const tableClient = roomClient.getTableClient();
    const myTableId = roomState.selectedTableId;
    console.log('[GameRoomView] tableClient:', tableClient, 'myTableId:', myTableId);

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
    console.log('[GameRoomView] Game status check started, myTableId:', myTableId, 'tableClient exists:', !!tableClient);
    if (myTableId && tableClient) {
        console.log(`[GameRoomView] Checking game status for myTableId: ${myTableId}`);
        
        const tableState = tableClient.getState();
        const isPlaying = tableState.status === 'playing';
        const isRoundEnded = tableState.isRoundEnded;
        
        // 只有在游戏进行中或回合结束（结算/复盘）时才显示全屏游戏界面
        // 入座但未开始时，显示房间列表和卡片
        if (isPlaying || isRoundEnded) {
            shouldShowGame = true;
            console.log('[GameRoomView] ✓ Game playing or round ended - showing game view');
        } else {
            console.log('[GameRoomView] ✗ Game not playing and not round ended - showing room list');
        }
    }

    // 如果游戏已开始，GameTableView会直接显示游戏界面
    // 使用 useMemo 稳定 myTable 的引用，防止不必要的重新挂载
    const myTable = useMemo(
        () => roomState.tables?.find((t: any) => t.tableId === myTableId),
        [roomState.tables, myTableId]
    );

    if (shouldShowGame && myTableId && tableClient && myTable) {
        console.log('[GameRoomView] ✅ Game playing, rendering GameTableView');
        return (
            <GameTableView
                key={`game-${myTableId}`}
                table={myTable}
                roomClient={roomClient}
                isMyTable={true}
            />
        );
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
