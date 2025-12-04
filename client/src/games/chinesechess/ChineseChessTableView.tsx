'use client';

import { useEffect, useState } from 'react';
import { ChineseChessRoomClient } from './gamepagehierarchy/ChineseChessRoomClient';

interface ChineseChessTableViewProps {
    table: any;
    roomClient: ChineseChessRoomClient;
    isMyTable: boolean;
}

export function ChineseChessTableView({ table, roomClient, isMyTable }: ChineseChessTableViewProps) {
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

    // 如果是我所在的桌子，获取 TableClient 来操作
    const tableClient = isMyTable ? roomClient.getChessTableClient() : null;
    const [localState, setLocalState] = useState<any>({});
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

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
        if (canJoin) {
            roomClient.selectTable(table.tableId);
        }
    };

    const handleReady = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (tableClient) {
            // 点击开始，发送准备指令
            tableClient.setReady(true);
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
        <div className={`bg-white rounded-2xl p-6 shadow-lg transition-all relative overflow-hidden flex flex-col h-full ${isMyTable ? 'border-2 border-amber-400' : 'border border-amber-100'
            }`}>
            {/* 顶部：桌号 + 状态 */}
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-3xl font-bold text-gray-800">
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

            {/* 中间：底豆信息 + 倒计时提示 */}
            <div className="mb-8 flex-1">
                <p className="text-gray-500 text-sm">
                    {table.baseBet ? `底豆: ${table.baseBet}` : '标准对局'}
                </p>

                {/* 倒计时显示 */}
                {isMyTable && timeLeft !== null && (
                    <div className="mt-4 text-center animate-pulse">
                        <p className="text-red-500 font-bold text-xl">
                            {localState.countdown?.message || (
                                localState.countdown?.type === 'ready' ? '准备倒计时' :
                                    localState.countdown?.type === 'start' ? '游戏即将开始' : '等待确认'
                            )}: {timeLeft}s
                        </p>
                    </div>
                )}
            </div>

            {/* 底部：操作区域 */}
            <div className="mt-auto w-full flex items-end justify-between">
                {/* 左下角：人数 */}
                <div className="flex items-center gap-1 text-gray-400 text-sm mb-1 flex-shrink-0">
                    <span>👤</span>
                    <span>{playerCount}/{maxPlayers}</span>
                </div>

                {/* 中央操作区 (Flex-1 占据剩余空间并居中，但限制最大宽度) */}
                <div className="flex-1 flex justify-center pl-2">
                    {isMyTable ? (
                        <div className="flex gap-2 w-full max-w-[160px]">
                            <button
                                onClick={handleLeave}
                                className="flex-1 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg font-bold hover:bg-gray-50 transition-colors shadow-sm text-xs"
                            >
                                离开
                            </button>

                            {/* 开始/就绪按钮 */}
                            <button
                                onClick={handleReady}
                                disabled={isReady}
                                className={`flex-1 py-1.5 rounded-lg font-bold transition-colors shadow-sm text-xs ${isReady
                                        ? 'bg-green-100 text-green-700 cursor-default'
                                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                                    }`}
                            >
                                {isReady ? '就绪' : '开始'}
                            </button>
                        </div>
                    ) : (
                        canJoin ? (
                            <button
                                onClick={handleJoin}
                                className="w-20 py-1.5 bg-white text-black border border-gray-200 rounded-lg font-bold hover:bg-gray-50 transition-colors shadow-sm text-xs"
                            >
                                入座
                            </button>
                        ) : (
                            <span className="text-gray-400 font-medium px-2 py-1 text-xs">
                                {isPlaying ? '观战' : '已满'}
                            </span>
                        )
                    )}
                </div>

                {/* 右下角占位 (与左侧人数宽度大致相当，保持视觉平衡) */}
                <div className="w-8 flex-shrink-0"></div>
            </div>
        </div>
    );
}
