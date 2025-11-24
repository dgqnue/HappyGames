const RoomManager = require('../game/RoomManager');
const Matchmaker = require('../game/Matchmaker');
const WalletService = require('../services/WalletService');

const feed = [];   // Save last 20 feed items

module.exports = (io, socket) => {
    // Start matchmaker if not started
    Matchmaker.start();

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

        Matchmaker.addToQueue(socket.user, socket, criteria);
        socket.emit('matchmaking_started');
    });

    socket.on('join_table', ({ roomId, tableId }) => {
        if (!socket.user) return socket.emit('error', 'Not authenticated');
        const result = RoomManager.joinTable(roomId, tableId, socket.user, socket);
        if (result.success) {
            socket.join(tableId);
            io.to(tableId).emit('table_update', result.table);
        } else {
            socket.emit('error', result.message);
        }
    });
};
