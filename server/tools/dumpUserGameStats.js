// server/tools/dumpUserGameStats.js
// Usage: node dumpUserGameStats.js [gameType] [limit]
// Example: node dumpUserGameStats.js chinesechess 50

const mongoose = require('mongoose');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/happygames';
const gameType = process.argv[2] || null;
const limit = parseInt(process.argv[3], 10) || 50;

// Ensure the models are loaded (adjust path if your project layout differs)
require(path.resolve(__dirname, '../src/models/UserGameStats'));
const UserGameStats = mongoose.model('UserGameStats');

async function run() {
  try {
    console.log('Connecting to MongoDB:', MONGO_URI);
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

    const baseFilter = {};
    if (gameType) baseFilter.gameType = gameType;

    const total = await UserGameStats.countDocuments(baseFilter);
    const activeFilter = { ...baseFilter, gamesPlayed: { $gt: 0 } };
    const totalActive = await UserGameStats.countDocuments(activeFilter);
    const totalInactive = total - totalActive;

    console.log('\n=== Summary ===');
    console.log('Game Type:', gameType || 'ALL');
    console.log('Total Players (matching filter):', total);
    console.log('Active Players (gamesPlayed > 0):', totalActive);
    console.log('Inactive Players (gamesPlayed == 0):', totalInactive);

    if (totalActive > 0) {
      console.log(`\n=== Top ${limit} Active Players by Rating ===`);
      const top = await UserGameStats.find(activeFilter).sort({ rating: -1 }).limit(limit).lean();
      top.forEach((s, i) => {
        console.log(`${i + 1}. userId=${s.userId} rating=${s.rating} gamesPlayed=${s.gamesPlayed} title=${s.title} titleRank=${s.titleRank} titleColor=${s.titleColor} lastPlayedAt=${s.lastPlayedAt}`);
      });
    } else {
      console.log('\nNo active players to list.');
    }

    if (totalInactive > 0) {
      console.log('\n=== Sample Inactive Players (gamesPlayed == 0) ===');
      const inactiveSample = await UserGameStats.find({ ...baseFilter, gamesPlayed: 0 }).limit(50).lean();
      inactiveSample.forEach((s, i) => {
        console.log(`${i + 1}. userId=${s.userId} rating=${s.rating} gamesPlayed=${s.gamesPlayed} title=${s.title} titleRank=${s.titleRank}`);
      });
    }

    await mongoose.disconnect();
    console.log('\nDone.');
  } catch (err) {
    console.error('Error while dumping UserGameStats:', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
}

run();
