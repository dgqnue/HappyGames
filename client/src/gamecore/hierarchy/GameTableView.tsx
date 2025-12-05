'use client';

import { useEffect, useState, useRef } from 'react';
import { GameRoomClient } from './GameRoomClient';
import Image from 'next/image';
import SystemDialog from '@/components/SystemDialog';

interface GameTableViewProps {
    table: any;
    roomClient: GameRoomClient;
    isMyTable: boolean;
}

export function GameTableView({ table, roomClient, isMyTable }: GameTableViewProps) {
    // 调试日志
    console.log('[GameTableView] Rendering with table:', table);
    console.log('[GameTableView] Players:', table.players);
    console.log('[GameTableView] isMyTable:', isMyTable);
    console.log('[GameTableView] table.tableId:', table.tableId);
    console.log('[GameTableView] roomClient selectedTableId:', roomClient.getState().selectedTableId);

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
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogData, setDialogData] = useState<any>(null);

    // 检查玩家是否已在其他桌子入座
    const hasSeatedAtOtherTable = !isMyTable && roomClient.getState().selectedTableId !== null;

    // 监听roomClient状态变化，确保isMyTable正确更新
    useEffect(() => {
        const currentTableClient = tableClient;
        if (!currentTableClient) return;
        
        // 当roomClient状态变化时，强制重新渲染组件
        // 这确保被踢出后isMyTable能正确变为false
        const handleRoomStateUpdate = () => {
            // 强制更新本地状态
            const s = currentTableClient!.getState();
            setLocalState(s);
        };
        
        // 假设roomClient有状态更新回调，如果没有，我们可以使用轮询或事件
        // 这里我们使用一个简单的间隔检查，确保及时更新
        const interval = setInterval(() => {
            const s = currentTableClient!.getState();
            // 如果tableClient状态显示没有桌子了，但isMyTable仍然为true，强制更新
            if (!s.tableId && isMyTable) {
                handleRoomStateUpdate();
            }
        }, 500);
        
        return () => clearInterval(interval);
    }, [tableClient, isMyTable, roomClient]);

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

            // 设置被踢出回调
            tableClient.setOnKickedCallback((data: any) => {
                console.log('[GameTableView] Kicked callback triggered:', data);
                // 清除房间客户端的选择，确保UI恢复到入座状态
                roomClient.deselectTable();
                // 强制触发一次状态更新，确保按钮状态刷新
                setTimeout(() => {
                    const s = tableClient.getState();
                    setLocalState(s);
                    // 额外强制刷新游戏桌列表，确保其他玩家能看到
                    if (roomClient.getState().currentRoom) {
                        roomClient.getTableList(roomClient.getState().currentRoom.id);
                    }
                }, 0);
                
                setDialogData({
                    title: '已被移出游戏桌',
                    message: `原因: ${data.reason}`,
                    type: 'warning'
                });
                setDialogOpen(true);
            });

            // 倒计时定时器
            const timer = setInterval(() => {
                const s = tableClient.getState();
                if (s.countdown && s.countdown.start && s.countdown.timeout) {
                    const elapsed = Date.now() - s.countdown.start;
                    const remaining = Math.max(0, Math.ceil((s.countdown.timeout - elapsed) / 1000));
                    setTimeLeft(remaining);
                }
            }, 1000);

            return () => {
                clearInterval(timer);
                // 清理回调
                tableClient.setOnKickedCallback(() => {});
            };
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

    const handleDialogClose = () => {
        setDialogOpen(false);
    };

    // 渲染玩家信息
    const renderPlayer = (player: any, position: 'left' | 'right') => {
        const displayName = player ? (player.nickname || player.username || player.piUsername || '玩家') : '';
        const displayTitle = player ? (player.title || '初出茅庐') : '';
        const avatarUrl = player ? (player.avatar || '/images/default-avatar.png') : '/images/default-avatar.png';
        const titleColor = player ? (player.titleColor || '#666') : '#666';

        return (
            <div className="flex flex-col items-center justify-center">
                {/* 昵称 + 称号（分行显示在头像上方） */}
                <div className="flex flex-col items-center justify-center h-[32px] mb-2">
                    <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-[10px] font-medium truncate max-w-[100px] text-center leading-tight ${player ? 'text-gray-800' : 'text-transparent'}`}>
                            {displayName || ''}
                        </span>
                        <span
                            className={`text-sm font-medium whitespace-nowrap leading-tight ${player ? '' : 'text-transparent'}`}
                            style={{ color: player ? titleColor : 'transparent' }}
                        >
                            {displayTitle || ''}
                        </span>
                    </div>
                </div>

                {/* 头像 */}
                <div className="relative w-16 h-16">
                    {player ? (
                        <>
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
                        </>
                    ) : (
                        <div className="w-full h-full rounded-full border-2 border-amber-200 opacity-0"></div>
                    )}
                </div>
            </div>
        );
    };

    const borderColor = isMyTable ? '#60a5fa' : '#f59e0b'; // blue-400 (淡蓝), amber-500 (金色)
    const borderWidth = '1px';
    const componentHeight = '280px'; // 再降低一点高度
    
    return (
        <div 
            className="bg-white rounded-xl p-3 shadow-sm transition-all duration-300 relative overflow-hidden flex flex-col"
            style={{ 
                height: componentHeight,
                minHeight: componentHeight,
                maxHeight: componentHeight,
                borderWidth: borderWidth,
                borderStyle: 'solid',
                borderColor: borderColor,
                boxShadow: isMyTable 
                    ? '0 1px 6px -1px rgba(96, 165, 250, 0.2), 0 1px 3px -1px rgba(96, 165, 250, 0.1)'
                    : '0 1px 6px -1px rgba(245, 158, 11, 0.2), 0 1px 3px -1px rgba(245, 158, 11, 0.1)'
            }}
        >
            {/* 对话框组件 */}
            <SystemDialog
                isOpen={dialogOpen}
                onClose={handleDialogClose}
                title={dialogData?.title || ''}
                message={dialogData?.message || ''}
                type={dialogData?.type || 'warning'}
                confirmText="知道了"
                onConfirm={handleDialogClose}
                showCancel={false}
            />

            {/* 顶部：桌号 + 状态 */}
            <div className="flex justify-between items-start mb-6">
                <h3 className="text-sm text-gray-600">
                    游戏桌：{String(displayId).padStart(2, '0')}
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
                <div className="flex flex-col items-center justify-center mx-4 h-16">
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
                        <div className="invisible h-full w-full"></div>
                    )}
                </div>

                {/* 右侧玩家 */}
                {renderPlayer(player2, 'right')}
            </div>

            {/* 左下角玩家计数 */}
            <div className="absolute left-4 bottom-4 flex items-center gap-1 text-xs text-gray-600">
                <span>👤</span>
                <span>{playerCount}/{maxPlayers}</span>
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
