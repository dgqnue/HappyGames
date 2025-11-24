import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';

interface ReferralDetailsModalProps {
    userId: string;
    onClose: () => void;
}

export default function ReferralDetailsModal({ userId, onClose }: ReferralDetailsModalProps) {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'team' | 'commissions'>('team');
    const [referrals, setReferrals] = useState<any[]>([]);
    const [commissions, setCommissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'team') {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/referrals?userId=${userId}`);
                if (res.ok) setReferrals(await res.json());
            } else {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/commissions?userId=${userId}`);
                if (res.ok) setCommissions(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl h-[600px] flex flex-col shadow-2xl animate-fade-in">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-amber-900">{t.referral_details || 'Promotion Details'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('team')}
                        className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab === 'team'
                                ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50/50'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {t.my_team || 'My Team'}
                    </button>
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

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex justify-center items-center h-full text-gray-400">Loading...</div>
                    ) : (
                        <>
                            {activeTab === 'team' && (
                                <div className="space-y-4">
                                    {referrals.length === 0 ? (
                                        <p className="text-center text-gray-500 mt-10">No referrals yet.</p>
                                    ) : (
                                        referrals.map((user) => (
                                            <div key={user._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center text-lg">
                                                        {user.avatar ? <img src={user.avatar} className="w-full h-full rounded-full" /> : '👤'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{user.nickname || user.username}</p>
                                                        <p className="text-xs text-gray-500">Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                                                    Lv.{user.referralLevel}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'commissions' && (
                                <div className="space-y-4">
                                    {commissions.length === 0 ? (
                                        <p className="text-center text-gray-500 mt-10">No commissions yet.</p>
                                    ) : (
                                        commissions.map((tx) => (
                                            <div key={tx._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                <div>
                                                    <p className="font-bold text-gray-900">{tx.description}</p>
                                                    <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString()}</p>
                                                </div>
                                                <span className="font-bold text-green-600">+{tx.amount.toFixed(2)} Beans</span>
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
