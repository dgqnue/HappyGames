import React, { useState } from 'react';

interface MatchSettings {
    baseBet: number;
    betRange: [number, number];
    winRateRange: [number, number];
    maxDisconnectRate: number;
    ratingRange?: [number, number]; // 等级分范围（可选）
}

interface MatchSettingsPanelProps {
    onStartMatch: (settings: MatchSettings) => void;
    onCancel?: () => void;
}

export const MatchSettingsPanel: React.FC<MatchSettingsPanelProps> = ({
    onStartMatch,
    onCancel
}) => {
    const [baseBet, setBaseBet] = useState(1000);
    const [betMin, setBetMin] = useState(500);
    const [betMax, setBetMax] = useState(5000);
    const [winRateMin, setWinRateMin] = useState(0);
    const [winRateMax, setWinRateMax] = useState(100);
    const [maxDisconnectRate, setMaxDisconnectRate] = useState(100);
    const [ratingMin, setRatingMin] = useState(0);
    const [ratingMax, setRatingMax] = useState(3000);
    const [enableRatingFilter, setEnableRatingFilter] = useState(false);

    const handleStartMatch = () => {
        const settings: MatchSettings = {
            baseBet,
            betRange: [betMin, betMax],
            winRateRange: [winRateMin, winRateMax],
            maxDisconnectRate
        };

        // 如果启用了等级分筛选，添加等级分范围
        if (enableRatingFilter) {
            settings.ratingRange = [ratingMin, ratingMax];
        }

        onStartMatch(settings);
    };

    return (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-amber-900 mb-6">⚙️ 匹配设置</h2>

            {/* 底豆设置 */}
            <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    游戏底豆
                </label>
                <div className="flex items-center gap-4">
                    <input
                        type="range"
                        min="100"
                        max="100000"
                        step="100"
                        value={baseBet}
                        onChange={(e) => setBaseBet(Number(e.target.value))}
                        className="flex-1"
                    />
                    <input
                        type="number"
                        value={baseBet}
                        onChange={(e) => setBaseBet(Number(e.target.value))}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                        min="100"
                        max="100000"
                    />
                </div>
                <p className="text-xs text-gray-500 mt-1">范围: 100 - 100,000</p>
            </div>

            {/* 可接受的底豆范围 */}
            <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    可接受的底豆范围
                </label>
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <label className="text-xs text-gray-600">最小值</label>
                        <input
                            type="number"
                            value={betMin}
                            onChange={(e) => setBetMin(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                            min="100"
                            max="100000"
                        />
                    </div>
                    <span className="text-gray-500">-</span>
                    <div className="flex-1">
                        <label className="text-xs text-gray-600">最大值</label>
                        <input
                            type="number"
                            value={betMax}
                            onChange={(e) => setBetMax(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                            min="100"
                            max="100000"
                        />
                    </div>
                </div>
            </div>

            {/* 对方胜率范围 */}
            <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    对方胜率范围 (%)
                </label>
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <label className="text-xs text-gray-600">最小值</label>
                        <input
                            type="number"
                            value={winRateMin}
                            onChange={(e) => setWinRateMin(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                            min="0"
                            max="100"
                        />
                    </div>
                    <span className="text-gray-500">-</span>
                    <div className="flex-1">
                        <label className="text-xs text-gray-600">最大值</label>
                        <input
                            type="number"
                            value={winRateMax}
                            onChange={(e) => setWinRateMax(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                            min="0"
                            max="100"
                        />
                    </div>
                </div>
            </div>

            {/* 对方最大掉线率 */}
            <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    对方最大掉线率 (%)
                </label>
                <div className="flex items-center gap-4">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={maxDisconnectRate}
                        onChange={(e) => setMaxDisconnectRate(Number(e.target.value))}
                        className="flex-1"
                    />
                    <input
                        type="number"
                        value={maxDisconnectRate}
                        onChange={(e) => setMaxDisconnectRate(Number(e.target.value))}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                        min="0"
                        max="100"
                    />
                </div>
            </div>

            {/* 对方等级分范围（可选） */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-gray-700">
                        对方等级分范围（可选）
                    </label>
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={enableRatingFilter}
                            onChange={(e) => setEnableRatingFilter(e.target.checked)}
                            className="mr-2"
                        />
                        <span className="text-sm text-gray-600">启用筛选</span>
                    </label>
                </div>
                {enableRatingFilter && (
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="text-xs text-gray-600">最小值</label>
                            <input
                                type="number"
                                value={ratingMin}
                                onChange={(e) => setRatingMin(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                                min="0"
                                max="3000"
                            />
                        </div>
                        <span className="text-gray-500">-</span>
                        <div className="flex-1">
                            <label className="text-xs text-gray-600">最大值</label>
                            <input
                                type="number"
                                value={ratingMax}
                                onChange={(e) => setRatingMax(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                                min="0"
                                max="3000"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* 按钮 */}
            <div className="flex gap-4">
                <button
                    onClick={handleStartMatch}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg transform transition hover:scale-105"
                >
                    🔍 开始自动匹配
                </button>
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-all"
                    >
                        取消
                    </button>
                )}
            </div>

            {/* 提示信息 */}
            <div className="mt-4 p-4 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-800">
                    💡 <strong>提示：</strong>设置更宽松的条件可以更快匹配到对手
                </p>
            </div>
        </div>
    );
};
