// 文件：server/src/gamecore/queue.js
const fs = require('fs');
const path = require('path');
const { transfer_beans } = require('./wallet');

const DATA_DIR = path.join(__dirname, '../../data');
const QUEUE_FILE = path.join(DATA_DIR, 'queue.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

class PersistentQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(QUEUE_FILE)) {
                const data = fs.readFileSync(QUEUE_FILE, 'utf8');
                this.queue = JSON.parse(data);
                console.log(`Loaded ${this.queue.length} tasks from persistent queue.`);
                // Resume processing if there are tasks
                if (this.queue.length > 0) {
                    this.processNext();
                }
            }
        } catch (err) {
            console.error('Failed to load queue:', err);
            this.queue = [];
        }
    }

    save() {
        try {
            fs.writeFileSync(QUEUE_FILE, JSON.stringify(this.queue, null, 2));
        } catch (err) {
            console.error('Failed to save queue:', err);
        }
    }

    add(type, data) {
        this.queue.push({ type, data, createdAt: Date.now() });
        this.save();
        this.processNext();
    }

    async processNext() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;
        const task = this.queue[0]; // Peek first

        try {
            console.log(`Processing task: ${task.type}`);
            if (task.type === 'settle') {
                const { batchId, result } = task.data;
                const { winner, loser, amount } = result;
                await transfer_beans(winner, loser, amount, batchId);
            }

            // Success: Remove from queue
            this.queue.shift();
            this.save();

        } catch (err) {
            console.error('Queue processing error:', err);
            // Simple retry logic: Move to end of queue or keep retrying?
            // For now, if it's a "W002: Duplicate BatchId" error, we should treat it as success (idempotent)
            if (err.message && err.message.includes('W002')) {
                console.log('Task already processed (Idempotent), removing from queue.');
                this.queue.shift();
                this.save();
            } else {
                // For other errors, maybe wait a bit before retrying or move to dead letter queue?
                // To prevent blocking, let's move it to the end with a retry count
                const failedTask = this.queue.shift();
                failedTask.retries = (failedTask.retries || 0) + 1;
                if (failedTask.retries < 5) {
                    this.queue.push(failedTask);
                    this.save();
                    console.log(`Task failed, retrying later (Attempt ${failedTask.retries})`);
                } else {
                    console.error('Task failed max retries, dropping:', failedTask);
                    // Ideally write to a dead-letter file
                    this.save();
                }
            }
        } finally {
            this.processing = false;
            // Process next tick to allow IO
            setTimeout(() => this.processNext(), 100);
        }
    }
}

module.exports = new PersistentQueue();
