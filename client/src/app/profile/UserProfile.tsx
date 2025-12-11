'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WalletManager from './WalletManager';
import MyReferralModal from './MyReferralModal';
import { useLanguage } from '@/lib/i18n';

/**
 * 用户个人资料组件 (UserProfile)
 * 
 * 这是一个综合性的用户个人中心页面，用于展示和管理用户的所有信息。
 * 
 * 主要功能：
 * 1. 个人信息展示与编辑：
 *    - 头像 (支持上传修改)
 *    - 昵称 (支持修改)
 *    - 性别 (支持修改)
 *    - 用户ID、Pi用户名、注册时间等只读信息
 * 
 * 2. 资产管理：
 *    - 显示欢乐豆余额
 *    - 集成 WalletManager 组件进行充值和提现
 * 
 * 3. 游戏数据统计：
 *    - 展示各游戏的战绩 (总场次、胜率、连胜等)
 *    - 显示获得的称号和评分
 * 
 * 4. 推荐系统中心：
 *    - 显示推荐码和邀请链接
 *    - 展示邀请人数和总流水
 *    - 提供查看详细推荐数据的入口 (MyReferralModal)
 */
export default function UserProfile() {
    const router = useRouter();
    const { t } = useLanguage();

    // 默认 API URL (Render 后端)
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://happygames-tfdz.onrender.com';

    // ========== 状态管理 ==========

    /** 用户个人资料数据 */
    const [profile, setProfile] = useState<any>(null);

    /** 页面加载状态 */
    const [loading, setLoading] = useState(true);

    /** 当前头像展示用的 URL（后端返回或前端默认） */
    const [avatarSrc, setAvatarSrc] = useState<string>('/images/default-avatar.png');

    /** 是否正在编辑昵称 */
    const [isEditing, setIsEditing] = useState(false);

    /** 编辑中的昵称临时状态 */
    const [editNickname, setEditNickname] = useState('');

    /** 是否显示退出登录确认弹窗 */
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    /** 是否显示推荐详情弹窗 */
    const [showReferralDetails, setShowReferralDetails] = useState(false);

    /** 选中的新头像文件 */
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    /** 头像上传过程中的加载状态 */
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // ========== 副作用 ==========

    // 组件挂载时获取用户资料
    useEffect(() => {
        fetchProfile();
    }, []);

    // ========== API 方法 ==========

    /**
     * 获取用户个人资料
     * 从后端 API 获取最新的用户信息，包含基础信息、游戏数据和推荐统计
     */
    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');

            if (!token) {
                router.push('/');
                return;
            }

            const res = await fetch(`${API_URL}/api/user/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const { data } = await res.json();
                setProfile(data);
                setAvatarSrc(data.avatar || '/images/default-avatar.png');
            } else {
                // Token 失效或请求失败
                console.error('Failed to fetch profile:', res.status);
                if (res.status === 401) {
                    localStorage.removeItem('token');
                    router.push('/');
                }
            }
        } catch (error) {
            console.error('Failed to fetch profile', error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * 更新用户昵称
     * 提交新的昵称到服务器，成功后更新本地状态
     */
    const handleUpdateNickname = async () => {
        if (!editNickname.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/user/nickname`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nickname: editNickname })
            });

            const result = await res.json();

            if (res.ok) {
                setProfile(result.data);
                setIsEditing(false);
                alert('昵称更新成功！');
            } else {
                alert(result.message || '更新失败');
            }
        } catch (error) {
            alert('网络错误');
        }
    };

    /**
     * 更新用户性别
     * @param gender 'male' | 'female'
     */
    const handleUpdateGender = async (gender: 'male' | 'female') => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/user/gender`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ gender })
            });

            const result = await res.json();

            if (res.ok) {
                setProfile(result.data);
                alert('性别更新成功！');
            } else {
                alert(result.message || '更新失败');
            }
        } catch (error) {
            alert('网络错误');
        }
    };

    /**
     * 上传并更新用户头像
     * 将选中的图片文件上传到服务器，成功后更新头像显示
     */
    const handleUploadAvatar = async () => {
        if (!avatarFile) return;

        setUploadingAvatar(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('avatar', avatarFile);

            const res = await fetch(`${API_URL}/api/user/avatar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const result = await res.json();

            if (res.ok) {
                setProfile({ ...profile, avatar: result.data.avatar });
                setAvatarSrc(result.data.avatar || '/images/default-avatar.png');
                setAvatarFile(null);
                alert('头像上传成功！');
            } else {
                alert(result.message || '上传失败');
            }
        } catch (error) {
            alert('网络错误');
        } finally {
            setUploadingAvatar(false);
        }
    };

    /**
     * 处理退出登录
     * 清除本地 Token 并跳转回首页
     */
    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/');
    };

    // ========== 渲染逻辑 ==========

    // 加载中状态
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50">
                <div className="text-2xl font-bold text-amber-900 animate-pulse">加载中...</div>
            </div>
        );
    }

    // 未找到用户信息状态
    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4 text-amber-900">未找到用户信息</h2>
                    <p className="text-gray-600 mb-6">请尝试重新登录</p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                    >
                        返回首页
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">

                {/* ==================== 顶部头部区域：头像、昵称、操作按钮 ==================== */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl mb-6 border border-white/50">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                            {/* 头像显示与上传触发器 */}
                            <div className="relative group">
                                <div className="w-24 h-24 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full flex items-center justify-center shadow-lg overflow-hidden">
                                    <img
                                        src={avatarSrc || '/images/default-avatar.png'}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = '/images/default-avatar.png';
                                        }}
                                    />
                                </div>
                                <label className="absolute bottom-0 right-0 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-amber-600 transition-colors shadow-lg transform group-hover:scale-110">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setAvatarFile(e.target.files[0]);
                                            }
                                        }}
                                    />
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </label>
                            </div>

                            {/* 用户基本信息概览 */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <h1 className="text-2xl font-bold text-amber-900">
                                        {profile.nickname}
                                    </h1>
                                    <button
                                        onClick={() => {
                                            setEditNickname(profile.nickname);
                                            setIsEditing(true);
                                        }}
                                        className="text-amber-600 hover:text-amber-800 transition-colors p-1 hover:bg-amber-100 rounded-full"
                                        title="编辑昵称"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium border border-blue-200">
                                        ID: {profile.userId}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${profile.gender === 'male' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-pink-50 text-pink-700 border-pink-200'}`}>
                                        {profile.gender === 'male' ? '♂ 男' : '♀ 女'}
                                    </span>
                                    {profile.referralStats?.inviteCount > 0 && (
                                        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium border border-amber-200">
                                            Lv.{profile.referralLevel} 推广员
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 操作按钮：返回首页、退出登录 */}
                        <div className="flex items-center gap-3 mt-4 md:mt-0">
                            <button
                                onClick={() => router.push('/')}
                                className="w-10 h-10 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-sm"
                                title="返回首页"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setIsLoggingOut(true)}
                                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm font-bold flex items-center gap-2 shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                退出登录
                            </button>
                        </div>
                    </div>

                    {/* 头像上传预览与确认区域 */}
                    {avatarFile && (
                        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
                                        <img src={URL.createObjectURL(avatarFile)} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-sm text-amber-900 font-medium">已选择新头像: {avatarFile.name}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setAvatarFile(null)}
                                        className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={handleUploadAvatar}
                                        disabled={uploadingAvatar}
                                        className="px-4 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-bold disabled:opacity-50 shadow-sm transition-colors"
                                    >
                                        {uploadingAvatar ? '上传中...' : '确认上传'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ==================== 左侧栏：基本信息与钱包 ==================== */}
                    <div className="space-y-6">
                        {/* 基本信息卡片 */}
                        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/50">
                            <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                基本信息
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                    <span className="text-gray-600">用户 ID</span>
                                    <span className="font-mono font-bold text-blue-600">{profile.userId}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                    <span className="text-gray-600">Pi 用户名</span>
                                    <span className="font-medium text-gray-900">{profile.username}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                    <span className="text-gray-600">昵称</span>
                                    <span className="font-medium text-gray-900">{profile.nickname}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                    <span className="text-gray-600">性别</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleUpdateGender('male')}
                                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${profile.gender === 'male'
                                                ? 'bg-blue-500 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                        >
                                            ♂ 男
                                        </button>
                                        <button
                                            onClick={() => handleUpdateGender('female')}
                                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${profile.gender === 'female'
                                                ? 'bg-pink-500 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                        >
                                            ♀ 女
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                    <span className="text-gray-600">欢乐豆</span>
                                    <span className="font-bold text-orange-600 text-lg">{profile.happyBeans?.toLocaleString() || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">注册时间</span>
                                    <span className="text-sm text-gray-500">{new Date(profile.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* 钱包充值与提现组件 */}
                        <WalletManager userId={profile._id} nickname={profile.nickname} />
                    </div>

                    {/* ==================== 右侧栏：游戏数据与推荐统计 ==================== */}
                    <div className="space-y-6">
                        {/* 游戏数据卡片 */}
                        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/50">
                            <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                游戏数据
                            </h3>
                            {profile.gameStats && profile.gameStats.length > 0 ? (
                                <div className="space-y-4">
                                    {profile.gameStats.map((stat: any, index: number) => (
                                        <div key={index} className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="font-bold text-lg text-amber-900">{stat.gameName}</h4>
                                                <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-sm font-bold shadow-sm">
                                                    {stat.rating}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">称号:</span>
                                                    <span className="font-bold" style={{ color: stat.titleColor || '#d97706' }}>{stat.title}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">总场次:</span>
                                                    <span className="font-bold text-gray-900">{stat.gamesPlayed}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">胜率:</span>
                                                    <span className="font-bold text-green-600">{stat.winRate}%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">掉线率:</span>
                                                    <span className="font-bold text-red-600">{stat.disconnectRate}%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">最高连胜:</span>
                                                    <span className="font-bold text-orange-600">{stat.maxWinStreak}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">当前连胜:</span>
                                                    <span className="font-bold text-gray-900">{stat.currentWinStreak}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-lg mb-2">暂无游戏数据</p>
                                    <p className="text-sm">快去玩游戏吧！</p>
                                </div>
                            )}
                        </div>

                        {/* 推荐统计卡片 */}
                        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/50">
                            <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                推荐统计
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                    <span className="text-gray-600">推荐码</span>
                                    <span className="font-mono font-bold text-amber-600 text-lg tracking-wider">{profile.referralCode}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                    <span className="text-gray-600">邀请人数</span>
                                    <span className="font-bold text-gray-900">{profile.referralStats?.inviteCount || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">总流水</span>
                                    <span className="font-bold text-orange-600">{profile.referralStats?.totalFlow?.toLocaleString() || 0} 豆</span>
                                </div>
                            </div>
                            <div className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
                                <p className="text-sm text-orange-800 font-medium mb-2">推荐链接:</p>
                                <code className="block bg-white p-2 rounded border border-orange-200 text-xs text-gray-600 break-all font-mono">
                                    {process.env.NEXT_PUBLIC_CLIENT_URL}?ref={profile.referralCode}
                                </code>
                            </div>
                            <button
                                onClick={() => setShowReferralDetails(true)}
                                className="w-full py-3 mt-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                            >
                                查看详细数据
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ==================== 模态框区域 ==================== */}

            {/* 修改昵称模态框 */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all scale-100">
                        <h3 className="text-xl font-bold text-amber-900 mb-4">修改昵称</h3>
                        <input
                            type="text"
                            value={editNickname}
                            onChange={(e) => setEditNickname(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-amber-500 outline-none transition-shadow"
                            placeholder="输入新昵称"
                            maxLength={14}
                            autoFocus
                        />
                        <p className="text-sm text-gray-500 mb-6 bg-gray-50 p-3 rounded-lg">
                            💡 昵称不能与其他用户重复，最多14个字符。
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleUpdateNickname}
                                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors shadow-md"
                            >
                                保存修改
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 退出登录确认模态框 */}
            {isLoggingOut && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center transform transition-all scale-100">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">确认退出登录？</h3>
                        <p className="text-gray-500 mb-6">退出后需要重新登录才能访问。</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setIsLoggingOut(false)}
                                className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleLogout}
                                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-500/30"
                            >
                                确认退出
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 推荐详情模态框 */}
            {showReferralDetails && (
                <MyReferralModal
                    userId={profile._id}
                    onClose={() => setShowReferralDetails(false)}
                />
            )}
        </div>
    );
}
