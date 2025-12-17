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
    const [isMatching, setIsMatching] = useState(false);

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

    // 监听匹配相关事件
    useEffect(() => {
        const socket = roomClient.getSocket();
        
        const handleMatchQueueJoined = (data: any) => {
            console.log('[GameRoomView] Joined match queue:', data);
            setIsMatching(true);
        };
        
        const handleMatchFound = (data: any) => {
            console.log('[GameRoomView] Match found:', data);
            setIsMatching(false);
        };
        
        const handleMatchCancelled = () => {
            console.log('[GameRoomView] Match cancelled');
            setIsMatching(false);
        };
        
        const handleMatchFailed = (data: any) => {
            console.log('[GameRoomView] Match failed:', data);
            setIsMatching(false);
            // 显示错误消息
            if (data?.message) {
                alert('匹配失败: ' + data.message);
            }
        };
        
        socket.on('room_match_queue_joined', handleMatchQueueJoined);
        socket.on('match_found', handleMatchFound);
        socket.on('room_match_cancelled', handleMatchCancelled);
        socket.on('match_failed', handleMatchFailed);
        
        return () => {
            socket.off('room_match_queue_joined', handleMatchQueueJoined);
            socket.off('match_found', handleMatchFound);
            socket.off('room_match_cancelled', handleMatchCancelled);
            socket.off('match_failed', handleMatchFailed);
        };
    }, [roomClient]);

    console.log('[GameRoomView] render called, roomState:', roomState);
    const tableClient = roomClient.getTableClient();
    const myTableId = roomState.selectedTableId;
    console.log('[GameRoomView] tableClient:', tableClient, 'myTableId:', myTableId);

    // 追踪是否已经进入过游戏（用于区分“刚入座”和“游戏结束”）
    const [hasEnteredGame, setHasEnteredGame] = useState(false);

    // 当桌子改变时，重置 hasEnteredGame
    useEffect(() => {
        setHasEnteredGame(false);
    }, [myTableId]);

    useEffect(() => {
        if (!tableClient) return;

        const handleStateUpdate = (state: any) => {
            console.log('[GameRoomView] tableClient state update:', state.status);
            if (state.status === 'playing') {
                console.log('[GameRoomView] Game is now playing, forcing re-render');
                setHasEnteredGame(true); // 标记已进入游戏
                setRoomState(prev => ({ ...prev, _timestamp: Date.now() }));
            }
        };

        const initialState = tableClient.getState();
        if (initialState.status === 'playing') {
            console.log('[GameRoomView] Initial table state is playing');
            setHasEnteredGame(true); // 标记已进入游戏
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
        
        // 只有在游戏进行中，或者（回合结束且之前已经在游戏中）时才显示全屏游戏界面
        // 这样可以防止刚入座时因为残留的 isRoundEnded 状态而错误进入游戏界面
        if (isPlaying || (isRoundEnded && hasEnteredGame)) {
            shouldShowGame = true;
            console.log('[GameRoomView] ✓ Game playing or round ended (and entered) - showing game view');
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

    // 快速匹配处理函数
    const handleQuickMatch = () => {
        if (isMatching) {
            // 取消匹配
            roomClient.cancelQuickMatch();
            setIsMatching(false);
        } else {
            // 开始匹配
            const roomId = roomState.currentRoom?.id;
            if (roomId) {
                roomClient.requestQuickMatch(roomId);
                setIsMatching(true);
            }
        }
    };

    // 显示游戏室 - 房间列表，包含所有表格
    return (
        <main className="min-h-screen bg-amber-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
            {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
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
                    
                    {/* 快速匹配按钮 */}
                    <button
                        onClick={handleQuickMatch}
                        disabled={!!myTableId}
                        className={`px-6 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 ${
                            myTableId 
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : isMatching
                                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:shadow-xl animate-pulse'
                                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-xl transform hover:scale-105'
                        }`}
                    >
                        {isMatching ? (
                            <>
                                <span className="animate-spin">⏳</span> 匹配中... 点击取消
                            </>
                        ) : (
                            <>
                                <span className="text-xl">⚡</span> 快速匹配
                            </>
                        )}
                    </button>
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
