// RoomManager 已被移除，加入游戏桌的逻辑现在由各个 GameCenter 处理
// const RoomManager = require('../game/RoomManager');
const MatchPlayers = require('../core/matching/MatchPlayers');
const MatchingRules = MatchPlayers.MatchingRules;
const WalletService = require('../services/WalletService');

const feed = [];   // Save last 20 feed items

module.exports = (io, socket) => {
    // Matchmaker is now managed by GameLoader
    // MatchingRules.MatchMaker is a class, not a singleton instance here

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

        // Create a feed entry for this join
        const username = data?.username || 'Unknown Pioneer';
        const joinItem = {
            id: Date.now(),
            type: 'join',
            user: username,
            time: new Date().toLocaleTimeString()
        };
        feed.unshift(joinItem);
        if (feed.length > 20) feed.pop();
        io.to('lobby').emit('lobby_feed', joinItem);
    });

    // Deposit Handler
    socket.on('deposit', ({ amount, txId, username }) => {
        const depositItem = {
            id: Date.now(),
            type: 'deposit',
            user: username || 'Unknown Pioneer',
            amount,
            txId,
            time: new Date().toLocaleTimeString()
        };
        feed.unshift(depositItem);
        if (feed.length > 20) feed.pop();
        io.to('lobby').emit('lobby_feed', depositItem);
    });

    // Withdraw Handler
    socket.on('withdraw', ({ amount, txId, username }) => {
        const withdrawItem = {
            id: Date.now(),
            type: 'withdraw',
            user: username || 'Unknown Pioneer',
            amount,
            txId,
            time: new Date().toLocaleTimeString()
        };
        feed.unshift(withdrawItem);
        if (feed.length > 20) feed.pop();
        io.to('lobby').emit('lobby_feed', withdrawItem);
    });

    socket.on('start_matchmaking', (criteria) => {
        // User must be authenticated and attached to socket
        // For demo, we assume socket.user is set by auth middleware
        if (!socket.user) return socket.emit('error', 'Not authenticated');

        // Legacy matchmaking call - now handled by GameManager via 'auto_match' event
        // Matchmaker.addToQueue(socket.user, socket, criteria);
        socket.emit('error', 'Please use the new matchmaking system');
    });

    // 注意：join_table 事件已废弃
    // 加入游戏桌的逻辑现在由各个 GameCenter 通过 'chinesechess_join' 等事件处理
    // 如果需要通用的加入桌子逻辑，请使用对应游戏的事件
};
