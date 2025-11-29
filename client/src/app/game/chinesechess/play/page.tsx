'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import io from 'socket.io-client';
import ChessBoard from '../../../../components/ChineseChess/ChessBoard';
import { ChineseChessClient } from '../../../../components/ChineseChess/ChineseChessClient';
import { useRoomList } from '@/gamecore/useRoomList';
import { GameRoomList } from '@/components/GameTemplates/GameRoomList';
import { GamePlayLayout } from '@/components/GameTemplates/GamePlayLayout';
import { MatchSettingsPanel } from '@/components/GameTemplates/MatchSettingsPanel';

export default function ChineseChessPlay() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tier = searchParams.get('tier') || 'free';

    const [status, setStatus] = useState<'connecting' | 'lobby' | 'matching' | 'playing'>('connecting');
    const [gameClient, setGameClient] = useState<ChineseChessClient | null>(null);
    const [gameState, setGameState] = useState<any>(null);
    const [socket, setSocket] = useState<any>(null);

    // 匹配相关状态
    const [showMatchSettings, setShowMatchSettings] = useState(false);
    const [readyTimer, setReadyTimer] = useState<number | null>(null);
    const [isReady, setIsReady] = useState(false);

    // 使用双通道获取房间列表
    const rooms = useRoomList(socket, 'chinesechess', tier, {
        enableHttp: true,
        enableSocket: true,
        pollInterval: 5000
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/');
            return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://happygames-tfdz.onrender.com';
        console.log('Connecting to game server:', apiUrl);

        const newSocket = io(apiUrl, {
            auth: { token },
            transports: ['polling', 'websocket'],
            reconnection: true
        });

        newSocket.on('connect', () => {
            console.log('[Socket] Connected');
            console.log('[Socket] Socket ID:', newSocket.id);

            // ⭐ 发送 start_game 事件，告诉服务端要玩中国象棋
            console.log('[Socket] Sending start_game event for chinesechess...');
            newSocket.emit('start_game', 'chinesechess');

            const client = new ChineseChessClient(newSocket);

            client.init((state) => {
                setGameState(state);

                // 同步准备状态
                if (state && Array.isArray(state.players)) {
                    const myPlayer = state.players.find((p: any) => p.socketId === newSocket.id);
                    if (myPlayer) {
                        setIsReady(myPlayer.ready);
                    }
                }

                // 根据房间状态更新UI
                if (state.status === 'playing') {
                    setStatus('playing');
                    setReadyTimer(null); // 游戏开始，清除倒计时
                } else if (state.status === 'ended') {
                    // 保持在 playing 视图以显示结算
                    setReadyTimer(null);
                } else if (state.status === 'matching') {
                    // 准备检查阶段（匹配中），如果已经在 playing 视图（例如重连），保持
                    // 否则保持在 lobby 视图（显示 Modal）
                    if (status === 'playing') {
                        // 保持 playing
                    } else {
                        setStatus('lobby');
                    }
                } else if (state.status === 'waiting' || state.status === 'idle') {
                    // 检查自己是否在玩家列表中
                    const amIInRoom = state && Array.isArray(state.players) && state.players.some((p: any) => p.socketId === newSocket.id);

                    if (amIInRoom) {
                        // 保持在 lobby，显示 Modal
                        if (status !== 'lobby') setStatus('lobby');
                    } else {
                        // 如果不在房间里，保持在 lobby
                        // 注意：不要强制设为 lobby，因为可能正在 matching
                        if (status !== 'matching') {
                            setStatus('lobby');
                        }
                    }
                }
            });

            // 监听匹配事件
            newSocket.on('match_queue_joined', (data: any) => {
                console.log('已加入匹配队列:', data);
                setStatus('matching');
                setShowMatchSettings(false);
            });

            newSocket.on('match_found', (data: any) => {
                console.log('匹配成功:', data);
                // 自动进入房间，状态更新会由 init 中的回调处理
            });

            newSocket.on('match_failed', (data: any) => {
                alert(`匹配失败: ${data.message}`);
                setStatus('lobby');
            });

            // 监听准备检查
            newSocket.on('ready_check_start', (data: any) => {
                console.log('准备检查开始:', data);
                if (data && typeof data.timeout === 'number') {
                    setReadyTimer(data.timeout / 1000);
                } else {
                    console.warn('Invalid ready_check_start data:', data);
                    setReadyTimer(30);
                }
            });

            // 监听准备检查取消
            newSocket.on('ready_check_cancelled', (data: any) => {
                console.log('准备检查已取消:', data);
                setReadyTimer(null);
                // 可以选择显示一个提示消息
                if (data.reason) {
                    // 使用 toast 或者其他方式提示用户
                    console.log(`准备检查取消原因: ${data.reason}`);
                }
            });

            // 监听被踢出
            newSocket.on('kicked', (data: any) => {
                alert(`您已被踢出房间: ${data.reason}`);
                setStatus('lobby');
                setReadyTimer(null);
                setIsReady(false);
                setGameState(null); // 清空游戏状态，确保UI重置
            });

            setGameClient(client);
            setSocket(newSocket);
            setStatus('lobby');
        });

        newSocket.on('connect_error', (err: any) => {
            console.error('Socket error:', err);
            if (err.message.includes('Authentication error')) {
                router.push('/');
            }
        });

        return () => {
            if (gameClient) {
                gameClient.leave();
                gameClient.dispose();
            }
            newSocket.disconnect();
        };
    }, [router]);

    // 倒计时逻辑
    useEffect(() => {
        if (readyTimer === null || readyTimer <= 0) return;

        const timer = setInterval(() => {
            setReadyTimer(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [readyTimer]);

    const handleJoinRoom = (roomId: string) => {
        console.log('[ChineseChess] handleJoinRoom called with roomId:', roomId);
        console.log('[ChineseChess] gameClient:', gameClient);
        console.log('[ChineseChess] tier:', tier);

        if (!gameClient) {
            console.error('[ChineseChess] gameClient is null!');
            return;
        }

        // 手动入座，不需要匹配设置
        console.log('[ChineseChess] Calling gameClient.joinRoom...');
        gameClient.joinRoom(tier, roomId);
        console.log('[ChineseChess] joinRoom called, waiting for server response');
        // 状态更新将由 socket 事件触发
    };

    const handleQuickStart = () => {
        // 显示匹配设置面板
        setShowMatchSettings(true);
    };

    const handleStartAutoMatch = (settings: any) => {
        if (!gameClient) return;
        gameClient.autoMatch(settings);
    };

    const handleLeave = () => {
        if (gameClient) {
            if (status === 'matching') {
                gameClient.cancelMatch();
            } else {
                gameClient.leave();
            }
        }
        setStatus('lobby');
        setReadyTimer(null);
    };

    const handleMove = (fromX: number, fromY: number, toX: number, toY: number) => {
        if (gameClient) {
            gameClient.sendMove(fromX, fromY, toX, toY);
        }
    };

    const handleReady = () => {
        if (gameClient) {
            if (isReady) {
                // 取消准备
                gameClient.playerUnready();
                setIsReady(false);
            } else {
                // 准备
                gameClient.playerReady();
                setIsReady(true);
            }
        }
    };

    // 计算是否在房间中
    const amIInRoom = gameState && Array.isArray(gameState.players) && gameState.players.some((p: any) => p.socketId === socket?.id);
    const currentRoomId = amIInRoom ? gameState.roomId : null;

    if (status === 'connecting') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100">
                <div className="text-2xl font-bold text-amber-900 animate-pulse">连接服务器中...</div>
            </div>
        );
    }

    if (status === 'lobby') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100 p-4">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-6 flex items-center justify-between">
                        <h1 className="text-3xl font-bold text-amber-900">中国象棋 - {tier === 'free' ? '免费场' : tier === 'beginner' ? '初级场' : tier === 'intermediate' ? '中级场' : '高级场'}</h1>
                        <button
                            onClick={() => router.push('/game/chinesechess')}
                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            返回
                        </button>
                    </div>

                    <GameRoomList
                        gameName="中国象棋"
                        tier={tier}
                        rooms={rooms}
                        currentRoomId={currentRoomId}
                        onJoinRoom={handleJoinRoom}
                        onQuickStart={handleQuickStart}
                        readyTimer={readyTimer}
                        isReady={isReady}
                        onReady={handleReady}
                        onLeave={handleLeave}
                    />

                    {showMatchSettings && (
                        <MatchSettingsPanel
                            onClose={() => setShowMatchSettings(false)}
                            onStartMatch={handleStartAutoMatch}
                        />
                    )}
                </div>
            </div>
        );
    }

    if (status === 'matching') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100">
                <div className="text-center">
                    <div className="text-2xl font-bold text-amber-900 mb-4 animate-pulse">匹配中...</div>
                    <button
                        onClick={() => {
                            if (gameClient) gameClient.cancelMatch();
                            setStatus('lobby');
                        }}
                        className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                        取消匹配
                    </button>
                </div>
            </div>
        );
    }

    // status === 'playing'
    return (
        <GamePlayLayout
            gameState={gameState}
            onLeave={handleLeave}
            gameBoard={
                <ChessBoard
                    gameState={gameState}
                    onMove={handleMove}
                    mySocketId={socket?.id}
                />
            }
        />
    );
}
