'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Simplified User Profile Component for Testing
 */
export default function UserProfile() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            // 尝试从 localStorage 获取 mock 用户数据（临时方案）
            const mockUser = localStorage.getItem('mock_pi_user');

            if (!mockUser) {
                setError('未登录');
                setLoading(false);
                return;
            }

            const userData = JSON.parse(mockUser);

            // 模拟用户数据（临时方案，直到后端认证配置完成）
            setProfile({
                userId: 'HG00000001',
                username: userData.username || 'test_user',
                nickname: userData.username || 'test_user',
                avatar: '/images/default-avatar.png',
                gender: 'male',
                happyBeans: 0,
                gameStats: [],
                referralCode: 'TEST1234',
                referralStats: {
                    inviteCount: 0,
                    totalFlow: 0
                },
                createdAt: new Date().toISOString()
            });

            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch profile', error);
            setError('加载失败');
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50">
                <div className="text-2xl font-bold text-amber-900 animate-pulse">加载中...</div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50">
                <div className="bg-white/90 p-8 rounded-2xl shadow-xl text-center">
                    <h2 className="text-2xl font-bold mb-4 text-amber-900">{error || '未找到用户信息'}</h2>
                    <button
                        onClick={() => router.push('/')}
                        className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-bold"
                    >
                        返回首页
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl mb-6 border border-white/50">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                            {/* Avatar */}
                            <div className="w-24 h-24 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full flex items-center justify-center shadow-lg overflow-hidden">
                                <img
                                    src={profile.avatar}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Ctext x="50%25" y="50%25" font-size="48" text-anchor="middle" dy=".3em"%3E👤%3C/text%3E%3C/svg%3E';
                                    }}
                                />
                            </div>

                            {/* User Info */}
                            <div>
                                <h1 className="text-2xl font-bold text-amber-900 mb-2">
                                    {profile.nickname}
                                </h1>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                        ID: {profile.userId}
                                    </span>
                                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                                        {profile.gender === 'male' ? '♂ 男' : '♀ 女'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <button
                            onClick={() => router.push('/')}
                            className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-bold"
                        >
                            返回首页
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/50">
                        <h3 className="text-xl font-bold text-amber-900 mb-4">基本信息</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                <span className="text-gray-600">用户 ID</span>
                                <span className="font-mono font-bold text-blue-600">{profile.userId}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                <span className="text-gray-600">Pi 用户名</span>
                                <span className="font-medium">{profile.username}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                <span className="text-gray-600">昵称</span>
                                <span className="font-medium">{profile.nickname}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                <span className="text-gray-600">性别</span>
                                <span className="font-medium">{profile.gender === 'male' ? '男' : '女'}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                <span className="text-gray-600">欢乐豆</span>
                                <span className="font-bold text-orange-600 text-lg">{profile.happyBeans?.toLocaleString() || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">注册时间</span>
                                <span className="text-sm">{new Date(profile.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Game Stats */}
                    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/50">
                        <h3 className="text-xl font-bold text-amber-900 mb-4">游戏数据</h3>
                        {profile.gameStats && profile.gameStats.length > 0 ? (
                            <div className="space-y-4">
                                {profile.gameStats.map((stat: any, index: number) => (
                                    <div key={index} className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-bold text-lg text-amber-900">{stat.gameName}</h4>
                                            <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-sm font-bold">
                                                {stat.rating}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">称号:</span>
                                                <span className="font-medium">{stat.title}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">总场次:</span>
                                                <span className="font-bold">{stat.gamesPlayed}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">胜率:</span>
                                                <span className="font-bold text-green-600">{stat.winRate}%</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">掉线率:</span>
                                                <span className="font-bold text-red-600">{stat.disconnectRate}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <p className="text-lg mb-2">暂无游戏数据</p>
                                <p className="text-sm">快去玩游戏吧！</p>
                            </div>
                        )}
                    </div>

                    {/* Referral Stats */}
                    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/50 md:col-span-2">
                        <h3 className="text-xl font-bold text-amber-900 mb-4">推荐统计</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                                <p className="text-sm text-gray-600 mb-1">推荐码</p>
                                <p className="text-2xl font-bold text-blue-600">{profile.referralCode}</p>
                            </div>
                            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                                <p className="text-sm text-gray-600 mb-1">邀请人数</p>
                                <p className="text-2xl font-bold text-green-600">{profile.referralStats?.inviteCount || 0}</p>
                            </div>
                            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
                                <p className="text-sm text-gray-600 mb-1">总流水</p>
                                <p className="text-2xl font-bold text-orange-600">{profile.referralStats?.totalFlow?.toLocaleString() || 0} 豆</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notice */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm text-blue-800">
                        <strong>提示：</strong>这是简化版个人页面。完整功能（头像上传、昵称修改、性别切换）需要后端认证配置完成后才能使用。
                    </p>
                </div>
            </div>
        </div>
    );
}
