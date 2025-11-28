import React from 'react';

interface EloChange {
    delta: number;
    newRating: number;
}

interface EloResult {
    playerA?: EloChange;
    playerB?: EloChange;
}

interface GameState {
    status: 'waiting' | 'playing' | 'ended';
    winner?: string | null;
    mySide?: string;
    elo?: EloResult;
}

interface GamePlayLayoutProps {
    gameName: string;
    gameState: GameState | null;
    onLeave: () => void;
    onRestart: () => void;
    children: React.ReactNode;
}

export const GamePlayLayout: React.FC<GamePlayLayoutProps> = ({
    gameName,
    gameState,
    onLeave,
    onRestart,
    children
}) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-4 mb-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-amber-900">🏮 {gameName}</h1>
                    <button
                        onClick={onLeave}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all"
                    >
                        退出
                    </button>
                </div>

                {/* Game Area */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                    {/* Game Board (Children) */}
                    {gameState && gameState.status === 'playing' && children}

                    {/* Game Over Screen */}
                    {gameState && gameState.status === 'ended' && (
                        <div className="text-center py-10">
                            <div className="text-4xl font-bold text-amber-900 mb-6">
                                {gameState.winner === gameState.mySide ? '🎉 恭喜获胜!' : '😢 遗憾落败'}
                            </div>
                            {gameState.elo && (
                                <div className="text-xl text-gray-700 mb-8">
                                    等级分变化: <span className={(gameState.elo.playerA?.delta || 0) > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                                        {(gameState.elo.playerA?.delta || 0) > 0 ? '+' : ''}{gameState.elo.playerA?.delta}
                                    </span>
                                </div>
                            )}
                            <button
                                onClick={onRestart}
                                className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105"
                            >
                                再来一局
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
