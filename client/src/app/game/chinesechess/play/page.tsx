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

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        console.log('Connecting to game server:', apiUrl);

        const newSocket = io(apiUrl, {
            auth: { token },
            transports: ['polling', 'websocket'],
            reconnection: true
        });

        newSocket.on('connect', () => {
            console.log('[Socket] Connected');
            const client = new ChineseChessClient(newSocket);

            client.init((state) => {
                setGameState(state);

                // 根据房间状态更新UI
                if (state.status === 'playing') {
                    setStatus('playing');
                    setReadyTimer(null); // 游戏开始，清除倒计时
                } else if (state.status === 'ended') {
                    // 保持在 playing 视图以显示结算
                    setReadyTimer(null);
                } else if (state.status === 'ready_check') {
                    // 准备检查阶段，保持在 playing 视图（显示棋盘和准备按钮）
                    setStatus('playing');
                } else if (state.status === 'waiting') {
                    // 如果已经在房间里，显示等待界面（也是 playing 视图的一种）
                    // 只有当不在房间时才显示 lobby
                    if (state.players && Object.values(state.players).some(id => id === newSocket.user?._id)) {
                        setStatus('playing');
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
                setReadyTimer(data.timeout / 1000);
                setIsReady(false);
            });

            // 监听被踢出
            newSocket.on('kicked', (data: any) => {
                alert(`您已被踢出房间: ${data.reason}`);
                setStatus('lobby');
                setReadyTimer(null);
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
        if (!gameClient) return;
        // 手动入座，不需要匹配设置
        gameClient.joinRoom(tier, roomId);
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
            gameClient.playerReady();
            setIsReady(true);
        }
    };

    if (status === 'connecting') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100">
                <div className="text-2xl font-bold text-amber-900 animate-pulse">连接服务器中...</div>
            </div>
        );
    }

    if (status === 'lobby') {
        return (
            <>
                <GameRoomList
                    gameName="中国象棋"
                    tier={tier}
                    rooms={rooms}
                    onJoinRoom={handleJoinRoom}
                    onQuickStart={handleQuickStart}
                    onLeave={() => router.push('/game/chinesechess')}
                />
                {showMatchSettings && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl p-6 max-w-md w-full m-4">
                            <MatchSettingsPanel
                                onStartMatch={handleStartAutoMatch}
                                onCancel={() => setShowMatchSettings(false)}
                            />
                        </div>
                    </div>
                )}
            </>
        );
    }

    if (status === 'matching') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100">
                <div className="text-3xl font-bold text-amber-900 mb-4 animate-bounce">🔍 寻找对手中...</div>
                <p className="text-gray-600">请稍候，正在为您匹配旗鼓相当的对手</p>
                <button
                    onClick={handleLeave}
                    className="mt-8 px-6 py-2 text-gray-500 hover:text-gray-700 underline"
                >
                    取消匹配
                </button>
            </div>
        );
    }

    return (
        <GamePlayLayout
            gameName="中国象棋"
            gameState={gameState}
            onLeave={handleLeave}
            onRestart={() => {
                // 再来一局：如果还在房间里，只是重置了状态，可以重新准备
                // 如果已经退出了，需要重新匹配
                if (gameState?.status === 'ended') {
                    // 实际上服务端会在结束后自动进入准备检查
                    // 所以这里只需要确保UI显示正确
                    setReadyTimer(null);
                }
            }}
        >
            {/* 准备检查遮罩 */}
            {readyTimer !== null && readyTimer > 0 && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl text-center animate-in zoom-in duration-300">
                        <h3 className="text-2xl font-bold text-amber-900 mb-2">游戏准备</h3>
                        <div className="text-5xl font-mono font-bold text-orange-600 mb-6">{readyTimer}</div>
                        <p className="text-gray-600 mb-6">请确认您已准备好开始游戏</p>
                        <button
                            onClick={handleReady}
                            disabled={isReady}
                            className={`px-8 py-3 rounded-xl font-bold text-lg transition-all transform hover:scale-105 ${isReady
                                    ? 'bg-green-500 text-white cursor-default'
                                    : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg hover:shadow-xl'
                                }`}
                        >
                            {isReady ? '已准备 (等待对手)' : '开始游戏'}
                        </button>
                    </div>
                </div>
            )}

            {gameState && gameState.board && (
                <ChessBoard
                    board={gameState.board}
                    turn={gameState.turn}
                    mySide={gameState.mySide}
                    onMove={handleMove}
                />
            )}
        </GamePlayLayout>
    );
}
