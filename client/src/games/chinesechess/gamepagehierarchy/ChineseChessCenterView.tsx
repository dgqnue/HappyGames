'use client';

import { useEffect } from 'react';
import { GameCenterView } from '@/gamecore/hierarchy/GameCenterView';
import { registerGameDisplayPlugin } from '@/gamecore/hierarchy/GameDisplayPlugin';
import { ChineseChessCenterClient } from './ChineseChessCenterClient';
import { ChineseChessDisplayPlugin } from './ChineseChessDisplayPlugin';

interface ChineseChessCenterViewProps {
    centerClient: ChineseChessCenterClient;
    onBack: () => void;
}

/**
 * 中国象棋游戏中心视图
 * 这是一个简单的包装组件，将通用的 GameCenterView 与中国象棋的 CenterClient 连接
 * 游戏界面由 GameTableView 直接渲染
 */
export function ChineseChessCenterView({ centerClient, onBack }: ChineseChessCenterViewProps) {
    // 在挂载时立即注册插件 - 这是用户进入中国象棋的最早入口
    useEffect(() => {
        console.log('[ChineseChessCenterView] 📝 Registering ChineseChessDisplayPlugin...');
        const registeredPlugin = registerGameDisplayPlugin(ChineseChessDisplayPlugin);
        console.log('[ChineseChessCenterView] ✅ Plugin registered successfully:', registeredPlugin.gameType);
        
        return undefined;
    }, []); // 空依赖数组确保只运行一次

    return (
        <GameCenterView
            centerClient={centerClient}
            onBack={onBack}
        />
    );
}
