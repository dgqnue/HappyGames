'use client';

import { useEffect, useState, useRef } from 'react';
import { GameRoomClient } from './GameRoomClient';
import { getGameDisplayPluginForClient } from './GameDisplayPlugin';
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
    // 匹配状态：服务器明确发送matching，或者满座但状态为waiting（兼容旧逻辑）
    const isMatching = status === 'matching' || (status === 'waiting' && playerCount === maxPlayers);
    const isPlaying = status === 'playing';
    const canJoin = (isIdle || isWaiting) && playerCount < maxPlayers;
    
    // 调试状态
    console.log('[GameTableView] Status debug:', {
        status,
        playerCount,
        maxPlayers,
        isIdle,
        isWaiting,
        isMatching,
        isPlaying,
        canJoin
    });

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

    // 玩家信息 - 支持多种数据结构
    // 数据源：如果是我所在的桌子，优先使用localState.players；否则使用table.playerList或table.players
    let playerList = table.playerList || table.players || [];
    if (isMyTableLocal && localState.players && localState.players.length > 0) {
        // 使用本地状态中的玩家列表，以确保准备状态实时更新
        playerList = localState.players;
        console.log('[GameTableView] Using localState.players:', playerList);
    }
    // 调试：打印playerList中玩家的详细信息，包括座位索引
    console.log('[GameTableView] playerList full info:', playerList.map((p: any) => ({
        nickname: p.nickname,
        ready: p.ready,
        userId: p.userId,
        seatIndex: p.seatIndex,
        hasSeatIndex: p.seatIndex !== undefined,
        hasReady: p.ready !== undefined
    })));
    // 检查是否有重复的seatIndex
    const seatIndices = playerList.map((p: any) => p.seatIndex).filter((index: any) => index !== undefined);
    const duplicateSeats = seatIndices.filter((item: any, index: number) => seatIndices.indexOf(item) !== index);
    if (duplicateSeats.length > 0) {
        console.error('[GameTableView] WARNING: Duplicate seat indices found:', duplicateSeats);
    }
    // 详细打印每个玩家的seatIndex
    playerList.forEach((p: any, i: number) => {
        console.log(`[GameTableView] Player ${i}: nickname=${p.nickname}, seatIndex=${p.seatIndex}, ready=${p.ready}, userId=${p.userId}`);
    });

    // 按座位索引分配玩家到座位数组
    // 创建座位数组，长度为maxPlayers，初始为null
    const seats = new Array(maxPlayers).fill(null);

    // 检查是否有seatIndex字段
    const hasSeatIndex = playerList.length > 0 && playerList.some((p: any) => p.seatIndex !== undefined);

    if (hasSeatIndex) {
        // 先按座位索引分配
        playerList.forEach((player: any) => {
            if (player.seatIndex !== undefined && player.seatIndex >= 0 && player.seatIndex < maxPlayers) {
                seats[player.seatIndex] = player;
            }
        });

        // 检查是否有座位冲突（重复分配）
        let duplicateSeats = false;
        const usedIndices = new Set<number>();
        playerList.forEach((player: any) => {
            if (player.seatIndex !== undefined) {
                if (usedIndices.has(player.seatIndex)) {
                    duplicateSeats = true;
                } else {
                    usedIndices.add(player.seatIndex);
                }
            }
        });

        // 如果有重复，则按数组顺序重新分配
        if (duplicateSeats) {
            console.warn('[GameTableView] Duplicate seat indices detected, reassigning seats by array order');
            // 重置座位数组
            seats.fill(null);
            playerList.forEach((player: any, index: number) => {
                if (index < maxPlayers) {
                    seats[index] = player;
                }
            });
        }

        console.log('[GameTableView] Seat-based allocation:', {
            maxPlayers,
            seats: seats.map((p, idx) => p ? { seatIndex: idx, nickname: p.nickname } : null),
            playerList: playerList.map((p: any) => ({
                nickname: p.nickname,
                seatIndex: p.seatIndex,
                hasSeatIndex: p.seatIndex !== undefined
            })),
            duplicateSeats
        });
    } else {
        // 按数组顺序分配（兼容旧逻辑）
        playerList.forEach((player: any, index: number) => {
            if (index < maxPlayers) {
                seats[index] = player;
            }
        });
        console.log('[GameTableView] Array-order allocation (no seatIndex):', {
            maxPlayers,
            seats: seats.map((p, idx) => p ? { seatIndex: idx, nickname: p.nickname } : null),
            playerListLength: playerList.length
        });
    }

    // 对于两人桌，座位0在左，座位1在右
    // 保留这两个变量用于渲染，但不再使用leftPlayer/rightPlayer命名
    const seat0Player = seats[0] || null;
    const seat1Player = seats[1] || null;

    // 监听roomClient状态变化，确保isMyTable正确更新
    useEffect(() => {
        // 定期检查roomClient状态，确保UI与状态同步
        // 但在游戏进行中不要改变selectedTableId，防止中途卸载
        const interval = setInterval(() => {
            if (localState.status !== 'playing') {
                const newSelectedTableId = roomClient.getState().selectedTableId;
                if (newSelectedTableId !== selectedTableId) {
                    setSelectedTableId(newSelectedTableId);
                }
            }
        }, 300);

        return () => clearInterval(interval);
    }, [roomClient, selectedTableId, localState.status]);

    // 如果传入的isMyTable与本地不一致，更新本地状态
    // 但在游戏进行中不要改变，防止中途卸载重装
    useEffect(() => {
        if (isMyTable !== isMyTableLocal && localState.status !== 'playing') {
            setSelectedTableId(isMyTable ? table.tableId : null);
        }
    }, [isMyTable, localState.status]);

    // 同步 TableClient 状态
    useEffect(() => {
        if (tableClient) {
            const updateState = (s: any) => {
                console.log('[GameTableView] tableClient state update - full state:', s);
                console.log('[GameTableView] tableClient state update - isReady:', s.isReady);
                console.log('[GameTableView] tableClient state update - players:', s.players);
                if (s.players && s.players.length > 0) {
                    console.log('[GameTableView] Updated players with ready status:', s.players.map((p: any) => ({
                        nickname: p.nickname,
                        ready: p.ready,
                        isReady: p.isReady,
                        userId: p.userId,
                        hasReadyField: p.ready !== undefined,
                        hasIsReadyField: p.isReady !== undefined
                    })));
                }
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

            const initialState = tableClient.getState();
            console.log('[GameTableView] Initial tableClient state:', initialState);
            updateState(initialState);
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
                tableClient.setOnKickedCallback(() => { });
            };
        }
    }, [tableClient]);

    // 处理页面卸载或组件卸载时的自动离座
    // 使用 ref 来避免依赖项变化导致的重复执行
    const tableClientRef = useRef(tableClient);
    const isMyTableLocalRef = useRef(isMyTableLocal);
    const roomClientRef = useRef(roomClient);

    useEffect(() => {
        // 更新 ref 的值，但不触发 effect 重新执行
        tableClientRef.current = tableClient;
        isMyTableLocalRef.current = isMyTableLocal;
        roomClientRef.current = roomClient;
    }, [tableClient, isMyTableLocal, roomClient]);

    useEffect(() => {
        // 标记是否已经执行过离座，避免重复执行
        let hasLeft = false;

        const leaveSeat = () => {
            if (hasLeft) return;
            if (tableClientRef.current && isMyTableLocalRef.current) {
                const tableState = tableClientRef.current.getState?.();
                // 游戏进行中不要调用deselectTable - 这会导致tableClient被销毁
                // 只在idle或waiting状态时才允许完全离座
                if (tableState?.status !== 'playing') {
                    console.log('[GameTableView] Auto leaving seat due to page/component unload');
                    tableClientRef.current.leaveTable();
                    roomClientRef.current.deselectTable();
                    hasLeft = true;
                } else {
                    console.log('[GameTableView] Game in progress, not calling deselectTable to avoid destroying tableClient');
                    hasLeft = true; // 标记为已处理，但不销毁tableClient
                }
            }
        };

        // 页面卸载事件（刷新、关闭标签页、导航到其他网站）
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            // 注意：在 beforeunload 事件中，不能进行异步操作，但 leaveTable 是同步函数（发送 socket 消息）
            leaveSeat();
            // 可选：显示确认离开对话框（但可能会干扰用户体验）
            // event.preventDefault();
            // event.returnValue = '';
        };

        // 添加 beforeunload 事件监听
        window.addEventListener('beforeunload', handleBeforeUnload);

        // 组件卸载时也执行离座（例如路由切换）
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            leaveSeat();
        };
    }, []); // 空依赖数组：只在挂载/卸载时执行

    const isReady = localState.ready === true;

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

        // 直接使用player.ready字段（统一命名）
        const playerReady = !!player.ready; // 强制转换为布尔值

        return (
            <div className="flex flex-col items-center justify-center">
                {/* 就绪状态 - 占位显示以防止跳动 */}
                <div className={`h-6 flex items-center justify-center ${playerReady ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-sm text-green-500 tracking-widest">就绪</span>
                </div>

                {/* 昵称 + 称号（分行显示在头像上方） */}
                <div className="flex flex-col items-center justify-center h-[32px] mb-2">
                    <div className="flex flex-col items-center gap-0.5">
                        <span className="text-base truncate max-w-[100px] text-center leading-tight text-black">
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
                    {playerReady && (
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

    // ========== 游戏界面显示逻辑 - 使用插件系统 ==========
    // 查找合适的游戏显示插件
    const gameDisplayPlugin = tableClient && isPlaying ? getGameDisplayPluginForClient(tableClient) : null;
    
    if (isPlaying && isMyTableLocal && tableClient && !gameDisplayPlugin) {
        console.warn('[GameTableView] ⚠️ Game is playing but no plugin found!');
    }

    // 如果在游戏中且是我的游戏桌，显示游戏界面
    if (isPlaying && isMyTableLocal && tableClient && gameDisplayPlugin) {
        console.log('[GameTableView] ✅ Rendering game display with plugin:', gameDisplayPlugin.gameType);
        const { Component: GameDisplay } = gameDisplayPlugin;
        return (
            <GameDisplay
                tableClient={tableClient}
                isMyTable={true}
                onLeaveTable={() => {
                    tableClient.leaveTable();
                    roomClient.deselectTable();
                }}
            />
        );
    }

    // ========== 常规游戏桌显示（非游戏中） ==========
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
                    isMatching ? 'text-yellow-500' :
                        isWaiting ? 'text-green-500' :
                            isMyTableLocal ? 'text-green-500' :
                                'text-black'
                    }`}>
                    {isPlaying ? '游戏' : isMatching ? '匹配' : isWaiting ? '等待' : isMyTableLocal ? '等待' : '空闲'}
                </div>
            </div>

            {/* 中间：玩家区域 */}
            <div className="flex-1 flex items-center justify-between mb-6 px-4">
                {/* 左侧玩家（座位0） */}
                {renderPlayer(seat0Player, 'left')}

                {/* 中间：VS 或倒计时 */}
                <div className="flex flex-col items-center justify-center mx-4 h-16">
                    {isMyTableLocal && timeLeft !== null && (localState.countdown?.type === 'start' || (localState.countdown?.type === 'ready' && !isReady)) ? (
                        <div className="text-center animate-pulse">
                            <p className="text-red-500 text-lg font-medium">
                                {timeLeft}
                            </p>
                        </div>
                    ) : (
                        <div className="invisible h-full w-full"></div>
                    )}
                </div>

                {/* 右侧玩家（座位1） */}
                {renderPlayer(seat1Player, 'right')}
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

                        {/* 开始/取消按钮 - 允许切换 */}
                        <button
                            onClick={handleReady}
                            className={`px-6 py-2 rounded-lg transition-colors shadow-sm text-sm ${isReady
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                                }`}
                        >
                            {isReady ? '取消' : '开始'}
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
