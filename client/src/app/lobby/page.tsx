'use client';



import GameList from '@/components/Lobby/GameList';
import { useLanguage } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useRouter } from 'next/navigation';

export default function LobbyPage() {
    return (
        <main className="min-h-screen p-4 md:p-8 relative">
            <GameList />
        </main>
    );
}
