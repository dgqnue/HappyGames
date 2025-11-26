// server/src/scripts/testElo.js
const EloService = require('../gamecore/EloService');

// Mock Data
const playerA = { rating: 1500, gamesPlayed: 10 };
const playerB = { rating: 1600, gamesPlayed: 100 };
const muDynamic = 1400;

console.log('--- ELO Math Verification ---');

// 1. Calculate K
const kA = EloService.calculateK(playerA.rating, playerA.gamesPlayed, muDynamic);
console.log(`Player A (R=1500, G=10, Mu=1400)`);
console.log(`  f_games = 1/(1+10/50) = 1/1.2 = 0.833`);
console.log(`  f_rating = 1/(1+(1500-1400)/1000) = 1/1.1 = 0.909`);
console.log(`  Expected K = 4 + 36 * 0.833 * 0.909 = 4 + 27.27 = 31.27`);
console.log(`  Actual K = ${kA}`);

const kB = EloService.calculateK(playerB.rating, playerB.gamesPlayed, muDynamic);
console.log(`\nPlayer B (R=1600, G=100, Mu=1400)`);
console.log(`  f_games = 1/(1+100/50) = 1/3 = 0.333`);
console.log(`  f_rating = 1/(1+(1600-1400)/1000) = 1/1.2 = 0.833`);
console.log(`  Expected K = 4 + 36 * 0.333 * 0.833 = 4 + 10 = 14`);
console.log(`  Actual K = ${kB}`);

// 2. Calculate Expected Score
const expectedA = EloService.calculateExpected(playerA.rating, playerB.rating);
console.log(`\nExpected Score A (1500 vs 1600)`);
console.log(`  E_A = 1/(1+10^((1600-1500)/400)) = 1/(1+10^0.25) = 1/(1+1.778) = 0.36`);
console.log(`  Actual E_A = ${expectedA}`);

// 3. Calculate Delta (A wins)
const deltaA = EloService.calculateDelta(kA, 1, expectedA);
console.log(`\nDelta A (Win)`);
console.log(`  Delta = 31.27 * (1 - 0.36) = 31.27 * 0.64 = 20`);
console.log(`  Actual Delta = ${deltaA}`);

console.log('\n--- Verification Complete ---');
