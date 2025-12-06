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
    console.log('[GameTableView] PlayerList:', table.playerList);
    console.log('[GameTableView] Player details:');
    if (table.players && table.players.length > 0) {
        table.players.forEach((p: any, i: number) => {
            console.log(`  Player ${i}:`, {
                nickname: p.nickname,
                username: p.username,
                piUsername: p.piUsername,
                title: p.title,
                avatar: p.avatar,
                titleColor: p.titleColor,
                ready: p.ready,
                isReady: p.isReady,
                seatIndex: p.seatIndex,
                user: p.user
            });
        });
    }
    if (table.playerList && table.playerList.length > 0) {
        console.log('[GameTableView] PlayerList details:');
        table.playerList.forEach((p: any, i: number) => {
            console.log(`  PlayerList ${i}:`, {
                nickname: p.nickname,
                title: p.title,
                winRate: p.winRate,
                disconnectRate: p.disconnectRate,
                ready: p.ready,
                wantsRematch: p.wantsRematch,
                seatIndex: p.seatIndex
            });
        });
    }
    console.log('[GameTableView] isMyTable:', isMyTable);
    console.log('[GameTableView] table.tableId:', table.tableId);
    console.log('[GameTableView] roomClient selectedTableId:', roomClient.getState().selectedTableId);

    // 提取纯数字桌号 (例如 "beginner_1" -> "1")
    const displayId = table.tableId.split('_').pop();

    // 状态定义
    const status = table.status || 'idle';
    const playerCount = table.playerCount || 0;
    const maxPlayers = table.maxPlayers || 2;
    
    const isIdle = status === 'idle';
    const isWaiting = status === 'waiting';
    const isMatching = status === 'matching' || (status === 'waiting' && playerCount === maxPlayers);
    const isPlaying = status === 'playing';
    const canJoin = (isIdle || isWaiting) && playerCount < maxPlayers;

    // 玩家信息 - 支持多种数据结构
    // 数据源：优先使用playerList，其次使用players
    const playerList = table.playerList || table.players || [];
    
    // 检查是否有seatIndex字段：检查所有玩家，确保至少有一个玩家有seatIndex字段
    const hasSeatIndex = playerList.length > 0 && playerList.some((p: any) => p.seatIndex !== undefined);
    
    let leftPlayer = null;
    let rightPlayer = null;
    
    if (hasSeatIndex) {
        // 按座位索引分配：座位0显示在左，座位1显示在右
        // 支持更多座位，但当前UI只显示左右两个位置
        leftPlayer = playerList.find((p: any) => p.seatIndex === 0) || null;
        rightPlayer = playerList.find((p: any) => p.seatIndex === 1) || null;
        
        console.log('[GameTableView] Seat-based allocation:', {
            hasSeatIndex,
            leftPlayer: leftPlayer ? { nickname: leftPlayer.nickname, seatIndex: leftPlayer.seatIndex } : null,
            rightPlayer: rightPlayer ? { nickname: rightPlayer.nickname, seatIndex: rightPlayer.seatIndex } : null,
            playerList: playerList.map((p: any) => ({ 
                nickname: p.nickname, 
                seatIndex: p.seatIndex,
                hasSeatIndex: p.seatIndex !== undefined 
            }))
        });
        
        // 调试：如果只有一个玩家，检查其座位索引
        if (playerList.length === 1) {
            const singlePlayer = playerList[0];
            console.log('[GameTableView] Single player with seatIndex:', {
                nickname: singlePlayer.nickname,
                seatIndex: singlePlayer.seatIndex,
                shouldDisplayLeft: singlePlayer.seatIndex === 0,
                shouldDisplayRight: singlePlayer.seatIndex === 1
            });
        }
    } else {
        // 按数组顺序：第一个玩家在左，第二个在右（兼容旧逻辑）
        leftPlayer = playerList[0] || null;
        rightPlayer = playerList[1] || null;
        console.log('[GameTableView] Array-order allocation (no seatIndex):', {
            hasSeatIndex,
            leftPlayer: leftPlayer ? { nickname: leftPlayer.nickname } : null,
            rightPlayer: rightPlayer ? { nickname: rightPlayer.nickname } : null,
            playerListLength: playerList.length
        });
    }
    
    // 本地跟踪选中的桌子ID，确保被踢出后立即更新
    const [selectedTableId, setSelectedTableId] = useState(roomClient.getState().selectedTableId);
    const isMyTableLocal = selectedTableId === table.tableId;
    
    // 检查玩家是否已在其他桌子入座
    const hasSeatedAtOtherTable = !isMyTableLocal && selectedTableId !== null;
    
    // 如果是我所在的桌子，获取 TableClient 来操作
    const tableClient = isMyTableLocal ? roomClient.getTableClient() : null;
    const [localState, setLocalState] = useState<any>({});
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogData, setDialogData] = useState<any>(null);

    // 监听roomClient状态变化，确保isMyTable正确更新
    useEffect(() => {
        // 定期检查roomClient状态，确保UI与状态同步
        const interval = setInterval(() => {
            const newSelectedTableId = roomClient.getState().selectedTableId;
            if (newSelectedTableId !== selectedTableId) {
                setSelectedTableId(newSelectedTableId);
            }
        }, 300);
        
        return () => clearInterval(interval);
    }, [roomClient, selectedTableId]);
    
    // 如果传入的isMyTable与本地不一致，更新本地状态
    useEffect(() => {
        if (isMyTable !== isMyTableLocal) {
            setSelectedTableId(isMyTable ? table.tableId : null);
        }
    }, [isMyTable]);

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
                // 立即更新本地状态，确保按钮立即恢复到入座状态
                setSelectedTableId(null);
                // 清除房间客户端的选择，确保UI恢复到入座状态
                roomClient.deselectTable();
                // 强制触发一次状态更新，确保按钮状态刷新
                setTimeout(() => {
                    const s = tableClient.getState();
                    setLocalState(s);
                    // 额外强制刷新游戏桌列表，确保其他玩家能看到
                    const roomState = roomClient.getState();
                    if (roomState.currentRoom?.id) {
                        roomClient.getTableList(roomState.currentRoom.id);
                    }
                }, 0);
                
                setDialogData({
                    title: '已被移出游戏桌',
                    message: '已被移出游戏桌\n原因: 未在规定时间内开始游戏',
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
        console.log('[GameTableView] handleLeave called, tableClient exists:', !!tableClient);
        if (tableClient) {
            console.log('[GameTableView] Calling tableClient.leaveTable()');
            tableClient.leaveTable();
            console.log('[GameTableView] Calling roomClient.deselectTable()');
            roomClient.deselectTable();
        }
        // 强制刷新游戏桌列表
        const roomState = roomClient.getState();
        if (roomState.currentRoom?.id) {
            console.log('[GameTableView] Forcing refresh of table list for room:', roomState.currentRoom.id);
            roomClient.getTableList(roomState.currentRoom.id);
        }
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
    };

    // 渲染玩家信息
    const renderPlayer = (player: any, position: 'left' | 'right') => {
        if (!player) {
            // 无玩家时的占位符
            return (
                <div className="flex flex-col items-center justify-center">
                    <div className="flex flex-col items-center justify-center h-[32px] mb-2">
                        <div className="flex flex-col items-center gap-0.5">
                            <span className="text-base truncate max-w-[100px] text-center leading-tight text-transparent">
                                {' '}
                            </span>
                            <span className="text-xs whitespace-nowrap leading-tight text-transparent">
                                {' '}
                            </span>
                        </div>
                    </div>
                    <div className="relative w-16 h-16">
                        <div className="w-full h-full rounded-full border-2 border-amber-200 opacity-0"></div>
                    </div>
                </div>
            );
        }

        // 从不同层级获取玩家信息
        const userObj = player.user || {};
        const displayName = player.nickname || userObj.nickname || player.username || userObj.username || player.piUsername || userObj.piUsername || '玩家';
        const displayTitle = player.title || '初出茅庐';
        const avatarUrl = player.avatar || userObj.avatar || '/images/default-avatar.png';
        const titleColor = player.titleColor || '#666';
        const isReady = player.ready || player.isReady || false;

        return (
            <div className="flex flex-col items-center justify-center">
                {/* 昵称 + 称号（分行显示在头像上方） */}
                <div className="flex flex-col items-center justify-center h-[32px] mb-2">
                    <div className="flex flex-col items-center gap-0.5">
                        <span className="text-base truncate max-w-[100px] text-center leading-tight text-gray-800">
                            {displayName}
                        </span>
                        <span
                            className="text-xs whitespace-nowrap leading-tight"
                            style={{ color: titleColor }}
                        >
                            {displayTitle}
                        </span>
                    </div>
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
                    {isReady && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                            <span className="text-white text-xs">✓</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const borderColor = isMyTableLocal ? '#60a5fa' : '#f59e0b'; // blue-400 (淡蓝), amber-500 (金色)
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
                boxShadow: isMyTableLocal 
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
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm text-black font-normal pt-1">
                    游戏桌：{String(displayId).padStart(2, '0')}
                </h3>

                <div className={`px-3 py-1 rounded-full text-sm font-normal ${isPlaying ? 'text-red-500' :
                    isMatching ? 'text-orange-500' :
                    isWaiting ? 'text-green-500' :
                    isMyTableLocal ? 'text-green-500' :
                    'text-black'
                    }`}>
            {isPlaying ? '游戏' : isMatching ? '匹配' : isWaiting ? '等待' : isMyTableLocal ? '等待' : '空闲'}
                </div>
            </div>

            {/* 中间：玩家区域 */}
            <div className="flex-1 flex items-center justify-between mb-6 px-4">
                {/* 左侧玩家 */}
                {renderPlayer(leftPlayer, 'left')}

                {/* 中间：VS 或倒计时 */}
                <div className="flex flex-col items-center justify-center mx-4 h-16">
            {isMyTableLocal && timeLeft !== null ? (
                        <div className="text-center animate-pulse">
                            <p className="text-red-500 text-2xl">
                                {timeLeft}
                            </p>
                            <p className="text-xs text-red-500 mt-1">
                                请在30秒内开始游戏
                            </p>
                        </div>
                    ) : (
                        <div className="invisible h-full w-full"></div>
                    )}
                </div>

                {/* 右侧玩家 */}
                {renderPlayer(rightPlayer, 'right')}
            </div>

            {/* 左下角玩家计数 */}
            <div className="absolute left-4 bottom-4 flex items-center gap-1 text-sm text-black">
                <span>👤</span>
                <span>{playerCount}/{maxPlayers}</span>
            </div>

            {/* 底部：操作区域 */}
            <div className="mt-auto w-full flex items-center justify-center gap-2">
                {isMyTableLocal ? (
                    <>
                        <button
                            onClick={handleLeave}
                            className="px-6 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm"
                        >
                            离开
                        </button>

                        {/* 开始/就绪按钮 - 允许切换 */}
                        <button
                            onClick={handleReady}
                            className={`px-6 py-2 rounded-lg transition-colors shadow-sm text-sm ${isReady
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
                            className={`px-8 py-2 rounded-lg transition-all shadow-sm text-sm ${hasSeatedAtOtherTable
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg'
                                }`}
                        >
                            入座
                        </button>
                    ) : (
                        <span className="text-gray-400 px-4 py-2 text-sm">
                            {isPlaying ? '观战' : '已满'}
                        </span>
                    )
                )}
            </div>
        </div>
    );
}
