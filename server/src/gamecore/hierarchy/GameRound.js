/**
 * GameRound (Base Class)
 * Represents a single round of a game (e.g. one match of Chess).
 * Manages the lifecycle of a round: Start -> Play -> End.
 */
class GameRound {
    constructor(table) {
        this.table = table;
        this.startTime = null;
        this.endTime = null;
        this.result = null;
        this.isActive = false;
    }

    start() {
        this.startTime = Date.now();
        this.isActive = true;
        this.onStart();
    }

    end(result) {
        if (!this.isActive) return;
        this.isActive = false;
        this.endTime = Date.now();
        this.result = result;
        this.onEnd(result);
    }

    // Abstract methods to be implemented by subclasses
    onStart() {}
    onEnd(result) {}
}

module.exports = GameRound;
