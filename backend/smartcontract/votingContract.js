// Smart Contract that enforces voting rules on the blockchain
// Rules: 
// 1. Each student can vote only once
// 2. Votes can only be cast during election period
// 3. Votes cannot be changed after submission

class VotingContract {
    constructor(electionStartTime, electionEndTime) {
        this.electionStartTime = electionStartTime;   // Unix timestamp (ms)
        this.electionEndTime = electionEndTime;       // Unix timestamp (ms)
        this.votedStudents = new Map();                // voterHash -> { candidateId, timestamp, blockIndex }
        this.totalVotes = 0;
        this.candidateVotes = new Map();               // candidateId -> voteCount
        this.contractAddress = this.generateContractAddress();
        this.contractDeployedAt = Date.now();
        this.isFinalized = false;
    }

    // Generate unique contract address (simulated)
    generateContractAddress() {
        const crypto = require('crypto');
        return crypto.createHash('sha256')
            .update('voting_contract_' + Date.now())
            .digest('hex')
            .substring(0, 16);
    }

    // Check if election is currently active
    isElectionActive() {
        const now = Date.now();
        return now >= this.electionStartTime && now <= this.electionEndTime && !this.isFinalized;
    }

    // Get election status
    getElectionStatus() {
        const now = Date.now();
        if (this.isFinalized) return 'FINALIZED';
        if (now < this.electionStartTime) return 'NOT_STARTED';
        if (now > this.electionEndTime) return 'ENDED';
        return 'ACTIVE';
    }

    // Core function: cast a vote (enforces all rules)
    castVote(voterHashedId, candidateId, securedVotePacket, blockIndex) {
        const status = this.getElectionStatus();
        
        // Rule 2: Check voting period
        if (status !== 'ACTIVE') {
            return {
                success: false,
                reason: `Election is ${status}. Voting not allowed.`,
                code: 'INVALID_PERIOD'
            };
        }

        // Rule 1: Check if student already voted
        if (this.votedStudents.has(voterHashedId)) {
            const existingVote = this.votedStudents.get(voterHashedId);
            return {
                success: false,
                reason: `Student has already voted for candidate ${existingVote.candidateId} at block ${existingVote.blockIndex}`,
                code: 'ALREADY_VOTED'
            };
        }

        // Validate candidate exists
        if (!this.isValidCandidate(candidateId)) {
            return {
                success: false,
                reason: `Candidate ${candidateId} does not exist`,
                code: 'INVALID_CANDIDATE'
            };
        }

        // Rule 3: Vote is recorded immutably (cannot be changed)
        // Record the vote
        this.votedStudents.set(voterHashedId, {
            candidateId: candidateId,
            timestamp: Date.now(),
            blockIndex: blockIndex,
            voteHash: securedVotePacket?.voteHash || 'pending'
        });

        // Update vote counts
        this.totalVotes++;
        const currentCount = this.candidateVotes.get(candidateId) || 0;
        this.candidateVotes.set(candidateId, currentCount + 1);

        return {
            success: true,
            message: `Vote cast successfully for candidate ${candidateId}`,
            transactionId: this.generateTransactionId(voterHashedId, candidateId),
            totalVotes: this.totalVotes
        };
    }

    // Generate transaction ID as proof of voting
    generateTransactionId(voterHashedId, candidateId) {
        const crypto = require('crypto');
        return crypto.createHash('sha256')
            .update(voterHashedId + candidateId + Date.now() + this.contractAddress)
            .digest('hex')
            .substring(0, 16);
    }

    // Check if a student has already voted (transparency)
    hasVoted(voterHashedId) {
        return this.votedStudents.has(voterHashedId);
    }

    // Get student's vote (without revealing identity publicly)
    getStudentVote(voterHashedId) {
        if (!this.votedStudents.has(voterHashedId)) {
            return null;
        }
        const vote = this.votedStudents.get(voterHashedId);
        return {
            candidateId: vote.candidateId,
            timestamp: vote.timestamp,
            blockIndex: vote.blockIndex,
            canVerify: true  // Student can verify with their transaction ID
        };
    }

    // Get current vote counts (transparent to all)
    getTally() {
        const tally = {};
        for (const [candidateId, count] of this.candidateVotes.entries()) {
            tally[candidateId] = count;
        }
        return {
            totalVotes: this.totalVotes,
            candidates: tally,
            lastUpdated: Date.now(),
            isFinalized: this.isFinalized
        };
    }

    // Validate candidate exists (simplified - would check against candidate registry)
    isValidCandidate(candidateId) {
        const validCandidates = ['CANDIDATE_A', 'CANDIDATE_B', 'CANDIDATE_C', 'CANDIDATE_D'];
        return validCandidates.includes(candidateId);
    }

    // Finalize election (no more votes can be cast)
    finalizeElection() {
        if (this.isFinalized) {
            return { success: false, reason: 'Election already finalized' };
        }
        
        const status = this.getElectionStatus();
        if (status === 'ACTIVE') {
            return { success: false, reason: 'Cannot finalize while election is active' };
        }
        
        this.isFinalized = true;
        return {
            success: true,
            message: 'Election finalized',
            finalTally: this.getTally()
        };
    }

    // Get contract information (transparency)
    getContractInfo() {
        return {
            contractAddress: this.contractAddress,
            deployedAt: this.contractDeployedAt,
            electionStartTime: this.electionStartTime,
            electionEndTime: this.electionEndTime,
            electionStatus: this.getElectionStatus(),
            totalVotes: this.totalVotes,
            uniqueVoters: this.votedStudents.size,
            isFinalized: this.isFinalized
        };
    }

    // Verify a vote using transaction ID (for student proof)
    verifyVote(voterHashedId, transactionId) {
        if (!this.votedStudents.has(voterHashedId)) {
            return { verified: false, reason: 'No vote found for this student' };
        }
        
        const vote = this.votedStudents.get(voterHashedId);
        const expectedTxId = this.generateTransactionId(voterHashedId, vote.candidateId);
        
        if (transactionId === expectedTxId) {
            return {
                verified: true,
                vote: {
                    candidateId: vote.candidateId,
                    timestamp: vote.timestamp,
                    blockIndex: vote.blockIndex
                }
            };
        }
        
        return { verified: false, reason: 'Transaction ID does not match' };
    }

    // Get all votes for audit (only for election officials, votes are hashed IDs)
    getAuditLog() {
        const auditLog = [];
        for (const [voterHash, vote] of this.votedStudents.entries()) {
            auditLog.push({
                voterHash: voterHash.substring(0, 10) + '...',  // Partial for privacy
                candidateId: vote.candidateId,
                timestamp: vote.timestamp,
                blockIndex: vote.blockIndex
            });
        }
        return auditLog;
    }

    // Simulate block confirmation (called when vote is added to blockchain)
    confirmVoteOnBlockchain(voterHashedId, blockIndex, blockHash) {
        if (this.votedStudents.has(voterHashedId)) {
            const vote = this.votedStudents.get(voterHashedId);
            vote.blockIndex = blockIndex;
            vote.blockHash = blockHash;
            this.votedStudents.set(voterHashedId, vote);
            return true;
        }
        return false;
    }
}

module.exports = VotingContract;