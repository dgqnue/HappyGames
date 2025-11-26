// 文件：server/src/gamecore/StateManager.js
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const STATE_FILE = path.join(DATA_DIR, 'gamestate.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

class StateManager {
    constructor() {
        this.state = {};
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(STATE_FILE)) {
                const data = fs.readFileSync(STATE_FILE, 'utf8');
                this.state = JSON.parse(data);
            }
        } catch (err) {
            console.error('Failed to load state:', err);
            this.state = {};
        }
    }

    save() {
        try {
            fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
        } catch (err) {
            console.error('Failed to save state:', err);
        }
    }

    async get(key) {
        return this.state[key];
    }

    async set(key, value) {
        this.state[key] = value;
        this.save(); // Sync save for safety in this simple implementation
    }

    async del(key) {
        delete this.state[key];
        this.save();
    }
}

module.exports = new StateManager();
