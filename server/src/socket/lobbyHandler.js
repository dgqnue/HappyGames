// RoomManager 已被移除，加入游戏桌的逻辑现在由各�?GameCenter 处理
// const RoomManager = require('../game/RoomManager');
const MatchPlayers = require('../gamecore/matching/MatchPlayers');
const StateMappingRules = require('../gamecore/matching/StateMappingRules');
const WalletService = require('../services/WalletService');
const LobbyFeed = require('../models/LobbyFeed');

module.exports = (io, socket) => {
    // Matchmaker is now managed by GameLoader
    // StateMappingRules.MatchMaker is a class, not a singleton instance here

    socket.on('join_lobby', async (data) => {
        socket.join('lobby');

        // Get Eco Pool Stats
        const ecoStats = await WalletService.checkEcoPoolHealth();

        socket.emit('lobby_update', {
            onlineUsers: io.engine.clientsCount,
            ecoPool: {
                totalBeans: ecoStats.totalBeans || 0,
                piReserve: ecoStats.totalPi || 0,
                minReserve: ecoStats.requiredPi || 0,
                officialWallet: process.env.OFFICIAL_WALLET_ADDRESS || 'GBD7...ECO...POOL'
            }
        });

        // Send feed history
        try {
            const history = await LobbyFeed.find().sort({ timestamp: -1 }).limit(200).lean();
            socket.emit('lobby_feed_history', history);
        } catch (err) {
            console.error('Error fetching lobby feed history:', err);
        }

        // Create a feed entry for this join
        const username = data?.username || 'Unknown Pioneer';
        
        try {
            const joinItem = new LobbyFeed({
                type: 'join',
                user: username,
                timestamp: new Date()
            });
            await joinItem.save();
            
            // Broadcast to lobby
            io.to('lobby').emit('lobby_feed', joinItem);

            // Cleanup old feeds (keep latest 200)
            const count = await LobbyFeed.countDocuments();
            if (count > 200) {
                const latest = await LobbyFeed.find().sort({ timestamp: -1 }).limit(200).select('_id');
                if (latest.length === 200) {
                    const latestIds = latest.map(doc => doc._id);
                    await LobbyFeed.deleteMany({ _id: { $nin: latestIds } });
                }
            }
        } catch (err) {
            console.error('Error saving join feed:', err);
        }
    });

    // Deposit Handler
    socket.on('deposit', async ({ amount, txId, username }) => {
        try {
            const depositItem = new LobbyFeed({
                type: 'deposit',
                user: username || 'Unknown Pioneer',
                amount,
                timestamp: new Date()
            });
            await depositItem.save();
            io.to('lobby').emit('lobby_feed', depositItem);
        } catch (err) {
            console.error('Error saving deposit feed:', err);
        }
    });

    // Withdraw Handler
    socket.on('withdraw', async ({ amount, txId, username }) => {
        try {
            const withdrawItem = new LobbyFeed({
                type: 'withdraw',
                user: username || 'Unknown Pioneer',
                amount,
                timestamp: new Date()
            });
            await withdrawItem.save();
            io.to('lobby').emit('lobby_feed', withdrawItem);
        } catch (err) {
            console.error('Error saving withdraw feed:', err);
        }
    });

    socket.on('start_matchmaking', (criteria) => {
        // User must be authenticated and attached to socket
        // For demo, we assume socket.user is set by auth middleware
        if (!socket.user) return socket.emit('error', 'Not authenticated');

        // Legacy matchmaking call - now handled by GameManager via 'auto_match' event
        // Matchmaker.addToQueue(socket.user, socket, criteria);
        socket.emit('error', 'Please use the new matchmaking system');
    });

    // 注意：join_table 事件已废�?
    // 加入游戏桌的逻辑现在由各�?GameCenter 通过 'chinesechess_join' 等事件处�?
    // 如果需要通用的加入桌子逻辑，请使用对应游戏的事�?
};
