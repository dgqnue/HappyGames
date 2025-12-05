'use client';

import { useEffect, useState } from 'react';
import { GameRoomClient } from './GameRoomClient';
import Image from 'next/image';

interface GameTableViewProps {
    table: any;
    roomClient: GameRoomClient;
    isMyTable: boolean;
}

export function GameTableView({ table, roomClient, isMyTable }: GameTableViewProps) {
    // 调试日志
    console.log('[GameTableView] Rendering with table:', table);
    console.log('[GameTableView] Players:', table.players);

    // 提取纯数字桌号 (例如 "beginner_1" -> "1")
    const displayId = table.tableId.split('_').pop();

    // 状态定义
    const status = table.status || 'idle';
    const isIdle = status === 'idle';
    const isWaiting = status === 'waiting';
    const isMatching = status === 'matching';
    const isPlaying = status === 'playing';

    const playerCount = table.playerCount || 0;
    const maxPlayers = table.maxPlayers || 2;
    const canJoin = (isIdle || isWaiting) && playerCount < maxPlayers;

    // 玩家信息
    const players = table.players || [];
    const player1 = players[0] || null;
    const player2 = players[1] || null;

    // 如果是我所在的桌子，获取 TableClient 来操作
    const tableClient = isMyTable ? roomClient.getTableClient() : null;
    const [localState, setLocalState] = useState<any>({});
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    // 检查玩家是否已在其他桌子入座
    const hasSeatedAtOtherTable = !isMyTable && roomClient.getState().selectedTableId !== null;

    // 同步 TableClient 状态
    useEffect(() => {
        if (tableClient) {
            const updateState = (s: any) => {
                setLocalState(s);

                // 处理倒计时逻辑
                if (s.countdown) {
                    if (s.countdown.type === 'start') {
                        // 3-2-1 倒计时直接显示数字
                        setTimeLeft(s.countdown.count);
                    } else if (s.countdown.start && s.countdown.timeout) {
                        // 计算剩余时间
                        const elapsed = Date.now() - s.countdown.start;
                        const remaining = Math.max(0, Math.ceil((s.countdown.timeout - elapsed) / 1000));
                        setTimeLeft(remaining);
                    }
                } else {
                    setTimeLeft(null);
                }
            };

            updateState(tableClient.getState());
            tableClient.init(updateState);

            // 倒计时定时器
            const timer = setInterval(() => {
                const s = tableClient.getState();
                if (s.countdown && s.countdown.start && s.countdown.timeout) {
                    const elapsed = Date.now() - s.countdown.start;
                    const remaining = Math.max(0, Math.ceil((s.countdown.timeout - elapsed) / 1000));
                    setTimeLeft(remaining);
                }
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [tableClient]);

    const isReady = localState.isReady || false;

    const handleJoin = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (canJoin && !hasSeatedAtOtherTable) {
            roomClient.selectTable(table.tableId);
        }
    };

    const handleReady = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (tableClient) {
            // 切换准备状态
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

    // 渲染玩家信息
    const renderPlayer = (player: any, position: 'left' | 'right') => {
        // 无玩家时返回占位元素，保持高度一致
        if (!player) {
            return (
                <div className="flex flex-col items-center justify-center">
                    {/* 占位：昵称+称号区域 (调整高度以匹配两行文本) */}
                    <div className="h-10 mb-2"></div>
                    {/* 占位：头像区域 */}
                    <div className="w-16 h-16"></div>
                </div>
            );
        }

        const displayName = player.nickname || player.username || player.piUsername || '玩家';
        const displayTitle = player.title || '初出茅庐';
        const avatarUrl = player.avatar || '/images/default-avatar.png';

        return (
            <div className="flex flex-col items-center justify-center">
                {/* 昵称 + 称号（分行显示在头像上方） */}
                <div className="flex flex-col items-center gap-0.5 mb-2">
                    <span className="text-sm font-medium text-gray-800 truncate max-w-[100px] text-center leading-tight">
                        {displayName}
                    </span>
                    <span
                        className="text-[10px] font-bold whitespace-nowrap leading-tight"
                        style={{ color: player.titleColor || '#666' }}
                    >
                        {displayTitle}
                    </span>
                </div>

                {/* 头像 */}
                <div className="relative w-16 h-16">
                    <Image
                        src={avatarUrl}
                        alt={displayName}
                        fill
                        className="rounded-full object-cover border-2 border-amber-200"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/default-avatar.png';
                        }}
                    />
                    {player.isReady && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                            <span className="text-white text-xs">✓</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={`bg-white rounded-2xl p-6 shadow-lg transition-all relative overflow-hidden flex flex-col h-[320px] ${isMyTable ? 'border-2 border-amber-400' : 'border-2 border-amber-100'
            }`}>
            {/* 顶部：桌号 + 状态 */}
            <div className="flex justify-between items-start mb-6">
                <h3 className="text-sm text-gray-600">
                    {displayId}
                </h3>

                <div className={`px-3 py-1 rounded-full text-xs font-bold ${isPlaying ? 'bg-red-100 text-red-700' :
                    isMatching ? 'bg-purple-100 text-purple-700' :
                        (isWaiting || isMyTable) ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                    }`}>
                    {isPlaying ? '游戏中' : isMatching ? '匹配中' : (isWaiting || isMyTable) ? '等待中' : '空闲'}
                </div>
            </div>

            {/* 中间：玩家区域 */}
            <div className="flex-1 flex items-center justify-between mb-6 px-4">
                {/* 左侧玩家 */}
                {renderPlayer(player1, 'left')}

                {/* 中间：VS 或倒计时 */}
                <div className="flex flex-col items-center justify-center mx-4">
                    {isMyTable && timeLeft !== null ? (
                        <div className="text-center animate-pulse">
                            <p className="text-red-500 font-bold text-2xl">
                                {timeLeft}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {localState.countdown?.message || '倒计时'}
                            </p>
                        </div>
                    ) : (
                        <span className="text-2xl font-bold text-gray-300">VS</span>
                    )}
                </div>

                {/* 右侧玩家 */}
                {renderPlayer(player2, 'right')}
            </div>

            {/* 底部：操作区域 */}
            <div className="mt-auto w-full flex items-center justify-center gap-2">
                {isMyTable ? (
                    <>
                        <button
                            onClick={handleLeave}
                            className="px-6 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg font-bold hover:bg-gray-50 transition-colors shadow-sm text-sm"
                        >
                            离开
                        </button>

                        {/* 开始/就绪按钮 - 允许切换 */}
                        <button
                            onClick={handleReady}
                            className={`px-6 py-2 rounded-lg font-bold transition-colors shadow-sm text-sm ${isReady
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                                }`}
                        >
                            {isReady ? '就绪' : '开始'}
                        </button>
                    </>
                ) : (
                    canJoin ? (
                        <button
                            onClick={handleJoin}
                            disabled={hasSeatedAtOtherTable}
                            className={`px-8 py-2 rounded-lg font-bold transition-all shadow-sm text-sm ${hasSeatedAtOtherTable
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg'
                                }`}
                        >
                            入座
                        </button>
                    ) : (
                        <span className="text-gray-400 font-medium px-4 py-2 text-sm">
                            {isPlaying ? '观战' : '已满'}
                        </span>
                    )
                )}
            </div>
        </div>
    );
}
