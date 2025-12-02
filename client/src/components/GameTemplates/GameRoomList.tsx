import React from 'react';

interface Room {
    id: string;
    status: 'idle' | 'waiting' | 'matching' | 'playing' | 'ended';
    players: number;
    spectators: number;
}

interface GameRoomListProps {
    gameName: string;
    tier: string;
    rooms: Room[];
    onJoinRoom: (roomId: string) => void;
    onQuickStart: () => void;
    onLeave: () => void;
    // 新增 props
    currentRoomId?: string | null;
    isReady?: boolean;
    readyTimer?: number | null;
    gameCountdown?: number | null;
    isLocked?: boolean;
    onReady?: () => void;
    onLeaveRoom?: () => void;
}

export const GameRoomList: React.FC<GameRoomListProps> = ({
    gameName,
    tier,
    rooms,
    onJoinRoom,
    onQuickStart,
    onLeave,
    currentRoomId,
    isReady,
    readyTimer,
    gameCountdown,
    isLocked,
    onReady,
    onLeaveRoom
}) => {
    const getTierName = (tierId: string) => {
        switch (tierId) {
            case 'free': return '免费室';
            case 'beginner': return '初级室';
            case 'intermediate': return '中级室';
            case 'advanced': return '高级室';
            default: return tierId;
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100 p-4">
            <div className="w-full max-w-4xl mt-8">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-amber-900">🏮 {gameName} - {getTierName(tier)}</h1>
                        <p className="text-gray-600">选择一个空闲桌子加入，或点击快速开始</p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={onQuickStart}
                            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg transform transition hover:scale-105"
                        >
                            ⚡ 快速开始
                        </button>
                        <button
                            onClick={onLeave}
                            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-all"
                        >
                            返回游戏中心
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rooms.map((room) => {
                        const isCurrentRoom = currentRoomId === room.id;
                        const isOtherRoom = !!currentRoomId && !isCurrentRoom;

                        return (
                            <div key={room.id} className={`bg-white/80 backdrop-blur-sm rounded-xl p-4 border shadow-md transition-all ${isCurrentRoom ? 'border-amber-500 ring-2 ring-amber-300 transform scale-105' : 'border-amber-100 hover:shadow-lg'}`}>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-bold text-amber-900">游戏桌: {room.id.split('_').pop()}</span>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${room.status === 'idle' ? 'bg-gray-100 text-gray-600' :
                                        room.status === 'waiting' ? 'bg-green-100 text-green-700' :
                                            room.status === 'matching' ? 'bg-orange-100 text-orange-700' :
                                                'bg-red-100 text-red-700'
                                        }`}>
                                        {
                                            room.status === 'idle' ? '空闲' :
                                                room.status === 'waiting' ? '等待中' :
                                                    room.status === 'matching' ? '匹配中' :
                                                        '游戏中'
                                        }
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
                                    <span>人数: {room.players}/2</span>
                                    <span>观众: {room.spectators}</span>
                                </div>

                                {isCurrentRoom ? (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={onLeaveRoom}
                                                className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-all"
                                            >
                                                离开
                                            </button>
                                            <button
                                                onClick={onReady}
                                                disabled={isLocked}
                                                className={`flex-1 py-2 font-bold rounded-lg transition-all ${isReady
                                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                                    : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg'
                                                    } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {isReady ? '就绪' : '开始'}
                                            </button>
                                        </div>
                                        {/* 倒计时显示逻辑优化: 只要有 readyTimer 就显示，或者状态是 matching */}
                                        {(readyTimer !== null && readyTimer !== undefined && !isNaN(readyTimer) && readyTimer > 0) || room.status === 'matching' ? (
                                            <div className="text-center text-orange-600 font-mono font-bold animate-pulse text-sm">
                                                ⏱️ {readyTimer || 30}s 后强制开始
                                            </div>
                                        ) : null}
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => onJoinRoom(room.id)}
                                        disabled={isOtherRoom || (room.status !== 'waiting' && room.status !== 'idle') || room.players >= 2}
                                        className={`w-full py-2 rounded-lg font-bold transition-all ${!isOtherRoom && (room.status === 'waiting' || room.status === 'idle') && room.players < 2
                                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {(room.status === 'waiting' || room.status === 'idle') && room.players < 2 ? '入座' : '已满员'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                    {rooms.length === 0 && (
                        <div className="col-span-full text-center py-10 text-gray-500">
                            暂无游戏桌，点击"快速开始"创建一个
                        </div>
                    )}
                </div>
            </div>

            {/* 游戏开始倒计时遮罩 */}
            {gameCountdown !== null && gameCountdown !== undefined && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white p-10 rounded-3xl shadow-2xl text-center transform scale-110 animate-bounce">
                        <div className="text-2xl font-bold text-gray-600 mb-4">游戏即将开始</div>
                        <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-red-600">
                            {gameCountdown === 0 ? 'GO!' : gameCountdown}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
