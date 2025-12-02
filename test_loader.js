const fs = require('fs');
const path = require('path');

const gameType = 'chinesechess';
const gamePath = path.join(__dirname, 'server/src/games/chinesechess');

console.log('Testing GameLoader logic...');
console.log('Game Path:', gamePath);

try {
    if (!fs.existsSync(gamePath)) {
        console.error('Game path does not exist!');
        process.exit(1);
    }

    const files = fs.readdirSync(gamePath);
    console.log('Files found:', files);

    // 优先查找 *Center.js
    let targetFile = files.find(f => f.endsWith('Center.js'));
    console.log('Found *Center.js:', targetFile);

    // 其次查找 *Manager.js
    if (!targetFile) {
        targetFile = files.find(f => f.endsWith('Manager.js'));
        console.log('Found *Manager.js:', targetFile);
    }

    // 最后尝试 index.js
    if (!targetFile && files.includes('index.js')) {
        targetFile = 'index.js';
        console.log('Found index.js:', targetFile);
    }

    if (targetFile) {
        const foundPath = path.join(gamePath, targetFile);
        console.log('Loading file:', foundPath);
        const CenterClass = require(foundPath);
        console.log('Class loaded:', CenterClass.name);
    } else {
        console.error('No target file found!');
    }
} catch (err) {
    console.error('Error:', err);
}
