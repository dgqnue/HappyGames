import React from 'react';

interface Player {
    userId: string;
    nickname: string;
    avatar?: string;
    ready: boolean;
    socketId: string;
}

interface RoomLobbyModalProps {
    roomId: string;
    players: Player[];
    maxPlayers: number;
    isReady: boolean;
    readyTimer: number | null; // 新增倒计时属性
    onReady: () => void;
    onLeave: () => void;
    currentUserId?: string;
}

export const RoomLobbyModal: React.FC<RoomLobbyModalProps> = ({
    roomId,
    players,
    maxPlayers,
    isReady,
    readyTimer, // 添加这行
    onReady,
    onLeave,
    currentUserId
}) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in duration-300">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h2 className="text-2xl font-bold text-amber-900">
                        游戏桌 {roomId.split('_').pop()}
                    </h2>
                    <div className="flex flex-col items-end">
                        <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
                            等待开始
                        </span>
                        {readyTimer !== null && readyTimer > 0 && (
                            <span className="text-orange-600 font-mono font-bold mt-1 animate-pulse">
                                ⏱️ {readyTimer}s
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                    {/* 玩家位 1 */}
                    <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 min-h-[160px] justify-center relative">
                        {players[0] ? (
                            <>
                                <div className="w-16 h-16 bg-amber-200 rounded-full mb-3 flex items-center justify-center text-2xl shadow-inner">
                                    {players[0].avatar || '👤'}
                                </div>
                                <div className="font-bold text-gray-800">{players[0].nickname}</div>
                                {players[0].ready && (
                                    <span className="mt-2 bg-green-500 text-white px-3 py-0.5 rounded-full text-xs shadow-sm animate-pulse">
                                        已准备
                                    </span>
                                )}
                            </>
                        ) : (
                            <div className="text-gray-400 flex flex-col items-center">
                                <span className="text-3xl mb-2 opacity-50">🪑</span>
                                等待加入...
                            </div>
                        )}
                    </div>

                    {/* 玩家位 2 */}
                    <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 min-h-[160px] justify-center relative">
                        {players[1] ? (
                            <>
                                <div className="w-16 h-16 bg-amber-200 rounded-full mb-3 flex items-center justify-center text-2xl shadow-inner">
                                    {players[1].avatar || '👤'}
                                </div>
                                <div className="font-bold text-gray-800">{players[1].nickname}</div>
                                {players[1].ready && (
                                    <span className="mt-2 bg-green-500 text-white px-3 py-0.5 rounded-full text-xs shadow-sm animate-pulse">
                                        已准备
                                    </span>
                                )}
                            </>
                        ) : (
                            <div className="text-gray-400 flex flex-col items-center">
                                <span className="text-3xl mb-2 opacity-50">🪑</span>
                                等待加入...
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={onLeave}
                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                    >
                        离座
                    </button>
                    <button
                        onClick={onReady}
                        disabled={isReady}
                        className={`flex-1 py-3 font-bold rounded-xl transition-all transform hover:scale-105 ${isReady
                            ? 'bg-green-500 text-white cursor-default'
                            : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg'
                            }`}
                    >
                        {isReady ? '已准备' : '准备开始'}
                    </button>
                </div>
            </div>
        </div>
    );
};
