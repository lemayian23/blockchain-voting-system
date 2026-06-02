const crypto = require('crypto');

class Block {
    constructor(index, timestamp, votes, previousHash = '') {
        this.index = index;
        this.timestamp = timestamp;
        this.votes = votes;  // Encrypted votes stored as array
        this.previousHash = previousHash;
        this.nonce = 0;
        this.hash = this.calculateHash();
    }

    // Calculate cryptographic hash of the block (SHA-256)
    calculateHash() {
        const blockData = JSON.stringify({
            index: this.index,
            timestamp: this.timestamp,
            votes: this.votes,
            previousHash: this.previousHash,
            nonce: this.nonce
        });
        
        return crypto.createHash('sha256')
            .update(blockData)
            .digest('hex');
    }

    // Proof of Work / Mining mechanism (simplified for demo)
    mineBlock(difficulty) {
        const target = Array(difficulty + 1).join('0');
        
        while (this.hash.substring(0, difficulty) !== target) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        
        console.log(`Block ${this.index} mined: ${this.hash}`);
    }

    // Verify block integrity
    verifyIntegrity() {
        const recalculatedHash = this.calculateHash();
        const isValid = this.hash === recalculatedHash;
        
        if (!isValid) {
            console.error(`Block ${this.index} integrity check FAILED!`);
        }
        
        return isValid;
    }

    // Get block summary (for transparency)
    getSummary() {
        return {
            index: this.index,
            timestamp: this.timestamp,
            voteCount: this.votes.length,
            hash: this.hash,
            previousHash: this.previousHash
        };
    }
}

module.exports = Block;