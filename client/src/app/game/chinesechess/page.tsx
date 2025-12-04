'use client';

import { useRouter } from 'next/navigation';

export default function ChineseChessPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-amber-50 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center text-5xl mx-auto mb-6">
                    🏮
                </div>
                <h1 className="text-3xl font-bold text-amber-900 mb-2">中国象棋</h1>
                <p className="text-gray-600 mb-8">
                    游戏正在开发中，敬请期待！
                    <br />
                    Xiangqi is coming soon!
                </p>
                <button
                    onClick={() => router.push('/lobby')}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-transform"
                >
                    返回大厅 / Back to Lobby
                </button>
            </div>
        </div>
    );
}
