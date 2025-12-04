/**
 * 我的推荐弹窗组件 (MyReferralModal)
 * 
 * 这是一个模态对话框组件，用于显示用户的推荐系统详细信息。
 * 
 * 主要功能：
 * 1. 我的团队 - 显示所有通过推荐链接注册的用户列表
 * 2. 佣金历史 - 显示所有获得的推荐佣金记录
 * 
 * 使用场景：
 * - 在用户个人资料页面点击"推荐详情"按钮时弹出
 * - 帮助用户了解自己的推荐成果和收益
 * 
 * 数据来源：
 * - 团队数据：GET /api/users/referrals?userId={userId}
 * - 佣金数据：GET /api/users/commissions?userId={userId}
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';

/**
 * 组件Props接口
 */
interface MyReferralModalProps {
    /** 用户ID，用于获取该用户的推荐数据 */
    userId: string;
    /** 关闭弹窗的回调函数 */
    onClose: () => void;
}

/**
 * 我的推荐弹窗主组件
 */
export default function MyReferralModal({ userId, onClose }: MyReferralModalProps) {
    // ========== 国际化 ==========
    const { t } = useLanguage();

    // ========== 状态管理 ==========

    /** 当前激活的标签页：'team'(我的团队) 或 'commissions'(佣金历史) */
    const [activeTab, setActiveTab] = useState<'team' | 'commissions'>('team');

    /** 推荐用户列表数据 */
    const [referrals, setReferrals] = useState<any[]>([]);

    /** 佣金记录列表数据 */
    const [commissions, setCommissions] = useState<any[]>([]);

    /** 数据加载状态 */
    const [loading, setLoading] = useState(true);

    // ========== 副作用：切换标签时重新获取数据 ==========
    useEffect(() => {
        fetchData();
    }, [activeTab]);

    /**
     * 获取数据函数
     * 根据当前激活的标签页，从服务器获取对应的数据
     */
    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'team') {
                // 获取推荐用户列表
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/referrals?userId=${userId}`);
                if (res.ok) setReferrals(await res.json());
            } else {
                // 获取佣金历史记录
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/commissions?userId=${userId}`);
                if (res.ok) setCommissions(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    // ========== 渲染 ==========
    return (
        // 遮罩层：半透明黑色背景 + 模糊效果
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            {/* 弹窗主容器 */}
            <div className="bg-white rounded-2xl w-full max-w-2xl h-[600px] flex flex-col shadow-2xl animate-fade-in">

                {/* ==================== 头部：标题 + 关闭按钮 ==================== */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-amber-900">
                        {t.referral_details || 'Promotion Details'}
                    </h3>

                    {/* 关闭按钮 */}
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="关闭"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* ==================== 标签页切换 ==================== */}
                <div className="flex border-b border-gray-100">
                    {/* 我的团队标签 */}
                    <button
                        onClick={() => setActiveTab('team')}
                        className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab === 'team'
                                ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50/50'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {t.my_team || 'My Team'}
                    </button>

                    {/* 佣金历史标签 */}
                    <button
                        onClick={() => setActiveTab('commissions')}
                        className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab === 'commissions'
                                ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50/50'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {t.commission_history || 'Commission History'}
                    </button>
                </div>

                {/* ==================== 内容区域 ==================== */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        // 加载中状态
                        <div className="flex justify-center items-center h-full text-gray-400">
                            Loading...
                        </div>
                    ) : (
                        <>
                            {/* ---------- 我的团队内容 ---------- */}
                            {activeTab === 'team' && (
                                <div className="space-y-4">
                                    {referrals.length === 0 ? (
                                        // 空状态：还没有推荐用户
                                        <p className="text-center text-gray-500 mt-10">
                                            No referrals yet.
                                        </p>
                                    ) : (
                                        // 推荐用户列表
                                        referrals.map((user) => (
                                            <div
                                                key={user._id}
                                                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100"
                                            >
                                                {/* 用户信息 */}
                                                <div className="flex items-center gap-3">
                                                    {/* 用户头像 */}
                                                    <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center text-lg">
                                                        {user.avatar ? (
                                                            <img
                                                                src={user.avatar}
                                                                className="w-full h-full rounded-full"
                                                                alt={user.nickname || user.username}
                                                            />
                                                        ) : (
                                                            '👤'
                                                        )}
                                                    </div>

                                                    {/* 用户名和加入时间 */}
                                                    <div>
                                                        <p className="font-bold text-gray-900">
                                                            {user.nickname || user.username}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            Joined: {new Date(user.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* 推荐等级标签 */}
                                                <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                                                    Lv.{user.referralLevel}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* ---------- 佣金历史内容 ---------- */}
                            {activeTab === 'commissions' && (
                                <div className="space-y-4">
                                    {commissions.length === 0 ? (
                                        // 空状态：还没有佣金记录
                                        <p className="text-center text-gray-500 mt-10">
                                            No commissions yet.
                                        </p>
                                    ) : (
                                        // 佣金记录列表
                                        commissions.map((tx) => (
                                            <div
                                                key={tx._id}
                                                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100"
                                            >
                                                {/* 佣金信息 */}
                                                <div>
                                                    <p className="font-bold text-gray-900">
                                                        {tx.description}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(tx.createdAt).toLocaleString()}
                                                    </p>
                                                </div>

                                                {/* 佣金金额 */}
                                                <span className="font-bold text-green-600">
                                                    +{tx.amount.toFixed(2)} Beans
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
