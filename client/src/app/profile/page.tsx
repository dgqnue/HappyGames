import UserProfile from '@/components/Profile/UserProfile';

export default function ProfilePage() {
    return (
        <main className="min-h-screen p-8 pt-24">
            <div className="absolute top-0 left-0 w-full p-6 flex items-center z-20">
                <a href="/" className="text-amber-900 font-bold hover:underline">&larr; Back to Home</a>
            </div>
            <UserProfile />
        </main>
    );
}
