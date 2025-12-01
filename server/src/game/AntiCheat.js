class AntiCheat {

    // Check if players can sit at the same table
    // playersOnTable: Array of player objects { id, ip, gps: {lat, lng} }
    // newPlayer: { id, ip, gps: {lat, lng} }
    static canJoinTable(playersOnTable, newPlayer) {
        for (const player of playersOnTable) {
            // 1. IP Check
            if (player.ip === newPlayer.ip) {
                return { allowed: false, reason: 'Same IP address detected' };
            }

            // 2. GPS Check (Simplified distance check)
            if (player.gps && newPlayer.gps) {
                const distance = this.calculateDistance(player.gps, newPlayer.gps);
                if (distance < 500) { // Less than 500 meters
                    return { allowed: false, reason: 'Players are too close geographically' };
                }
            }
        }
        return { allowed: true };
    }

    // Haversine formula for distance in meters
    static calculateDistance(gps1, gps2) {
        const R = 6371e3; // metres
        const φ1 = gps1.lat * Math.PI / 180; // φ, λ in radians
        const φ2 = gps2.lat * Math.PI / 180;
        const Δφ = (gps2.lat - gps1.lat) * Math.PI / 180;
        const Δλ = (gps2.lng - gps1.lng) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    // Check continuous play frequency (Stub)
    static async checkContinuousPlay(player1Id, player2Id) {
        // Query GameRecords for recent games between these two
        // If > X games in last Y hours, return false
        return true;
    }
}

module.exports = AntiCheat;
