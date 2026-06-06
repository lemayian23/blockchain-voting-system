const Block = require('./block');
const crypto = require('crypto');

class Blockchain {
    constructor(difficulty = 2) {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = difficulty;
        this.pendingVotes = [];
        this.miningReward = 0; // No reward for voting, just consensus
    }

    createGenesisBlock() {
        return new Block(0, Date.now(), [], "0");
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addVote(vote) {
        this.pendingVotes.push(vote);
    }

    minePendingVotes(minerAddress) {
        const block = new Block(
            this.chain.length,
            Date.now(),
            this.pendingVotes,
            this.getLatestBlock().hash
        );
        
        block.mineBlock(this.difficulty);
        
        console.log(`Block ${block.index} successfully mined!`);
        this.chain.push(block);
        
        this.pendingVotes = [];
        return block;
    }

    getVoteCount() {
        let totalVotes = 0;
        for (const block of this.chain) {
            totalVotes += block.votes.length;
        }
        return totalVotes;
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];
            
            // Check if current block's hash is valid
            if (!currentBlock.verifyIntegrity()) {
                console.log(`Block ${i} integrity check failed`);
                return false;
            }
            
            // Check if current block points to correct previous hash
            if (currentBlock.previousHash !== previousBlock.hash) {
                console.log(`Block ${i} has incorrect previous hash`);
                return false;
            }
        }
        return true;
    }

    // For transparency - allows anyone to verify votes
    verifyAllVotes(electionPublicKey, voterRegistry) {
        const verifiedVotes = [];
        const invalidVotes = [];
        
        for (const block of this.chain) {
            for (const vote of block.votes) {
                // This would verify each vote using the crypto module
                // Placeholder for now
                verifiedVotes.push(vote);
            }
        }
        
        return {
            totalVotes: verifiedVotes.length,
            invalidVotes: invalidVotes.length,
            isValid: invalidVotes.length === 0
        };
    }

    // Get chain summary for transparency
    getChainSummary() {
        return this.chain.map(block => block.getSummary());
    }

    // Replace chain if a longer valid chain is found (consensus)
    replaceChain(newChain) {
        if (newChain.length <= this.chain.length) {
            console.log("Received chain is not longer than current chain");
            return false;
        }
        
        // Verify the new chain
        const tempBlockchain = new Blockchain();
        tempBlockchain.chain = newChain;
        
        if (!tempBlockchain.isChainValid()) {
            console.log("Received chain is invalid");
            return false;
        }
        
        console.log("Replacing current chain with new longer valid chain");
        this.chain = newChain;
        return true;
    }
}

module.exports = Blockchain;