const feed = [];

module.exports = (io, socket) => {
    // Start matchmaker if not started
    Matchmaker.start();

    socket.on('join_lobby', async () => {
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
        const joinItem = {
            id: Date.now(),
            type: 'join',
            user: socket.id,
            time: new Date().toLocaleTimeString()
        };
        feed.unshift(joinItem);
        // Keep only latest 20 items
        if (feed.length > 20) feed.pop();
        // Broadcast to all lobby participants
        io.to('lobby').emit('lobby_feed', joinItem);
    });

// Existing handlers ...
