import React from 'react';
import { useRouter } from 'next/navigation';

interface Tier {
    id: string;
    name: string;
    desc: string;
    minRating: number;
    maxRating: number;
    color: string;
}

interface UserStats {
    rating: number;
    gamesPlayed: number;
    wins: number;
    title: string;
    titleColor: string;
}

interface GameRoomSelectorProps {
    gameName: string;
    gameNameEn: string;
    gamePath: string;
    userStats: UserStats | null;
    tiers?: Tier[];
    onBack?: () => void;
}

const DEFAULT_TIERS: Tier[] = [
    { id: 'free', name: '免费室', desc: '无需游戏豆', minRating: 0, maxRating: 9999, color: 'bg-gray-100' },
    { id: 'beginner', name: '初级室', desc: '< 1500分', minRating: 0, maxRating: 1499, color: 'bg-green-100' },
    { id: 'intermediate', name: '中级室', desc: '1500-1800分', minRating: 1500, maxRating: 1800, color: 'bg-blue-100' },
    { id: 'advanced', name: '高级室', desc: '> 1800分', minRating: 1801, maxRating: 9999, color: 'bg-purple-100' }
];

export const GameRoomSelector: React.FC<GameRoomSelectorProps> = ({
    gameName,
    gameNameEn,
    gamePath,
    userStats,
    tiers = DEFAULT_TIERS,
    onBack
}) => {
    const router = useRouter();

    const handleEnterRoom = (tierId: string) => {
        router.push(`${gamePath}/play?tier=${tierId}`);
    };

    const canAccessTier = (tier: Tier) => {
        // 如果没有获取到战绩（可能是Socket连接中），默认允许进入免费和初级场
        if (!userStats) {
            return tier.id === 'free' || tier.id === 'beginner';
        }

        if (tier.id === 'free') return true;
        const rating = userStats.rating || 1200;
        return rating >= tier.minRating && rating <= tier.maxRating;
    };

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.push('/lobby');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100 p-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-amber-900">🏮 {gameName}</h1>
                            <p className="text-amber-800/60 mt-1">{gameNameEn}</p>
                        </div>
                        <button
                            onClick={handleBack}
                            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all"
                        >
                            返回大厅
                        </button>
                    </div>
                </div>

                {/* User Stats */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6">
                    <h2 className="text-xl font-bold text-amber-900 mb-4">📊 我的战绩</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold" style={{ color: userStats?.titleColor || '#000' }}>
                                {userStats?.rating || 1200}
                            </div>
                            <div className="text-sm text-gray-600">等级分</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-amber-900">{userStats?.gamesPlayed || 0}</div>
                            <div className="text-sm text-gray-600">对局数</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-600">{userStats?.wins || 0}</div>
                            <div className="text-sm text-gray-600">胜</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold" style={{ color: userStats?.titleColor || '#000' }}>
                                {userStats?.title || '初出茅庐'}
                            </div>
                            <div className="text-sm text-gray-600">称号</div>
                        </div>
                    </div>
                </div>

                {/* Room Tiers */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6">
                    <h2 className="text-xl font-bold text-amber-900 mb-4">🚪 选择游戏室</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {tiers.map(tier => {
                            const accessible = canAccessTier(tier);
                            return (
                                <div
                                    key={tier.id}
                                    className={`${tier.color} rounded-xl p-6 border-2 ${accessible ? 'border-amber-300' : 'border-gray-300 opacity-50'}`}
                                >
                                    <h3 className="text-2xl font-bold text-amber-900 mb-2">{tier.name}</h3>
                                    <p className="text-gray-700 mb-4">{tier.desc}</p>
                                    <button
                                        onClick={() => handleEnterRoom(tier.id)}
                                        disabled={!accessible}
                                        className={`w-full py-3 rounded-xl font-bold transition-all ${accessible
                                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        {accessible ? '进入' : '等级不符'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
