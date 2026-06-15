const crypto = require('crypto');

class VotingContract {
    constructor(electionStartTime, electionEndTime) {
        this.electionStartTime = electionStartTime;
        this.electionEndTime = electionEndTime;
        this.votedStudents = new Map();
        this.totalVotes = 0;
        this.candidateVotes = new Map();
        this.contractAddress = this.generateContractAddress();
        this.contractDeployedAt = Date.now();
        this.isFinalized = false;
    }

    generateContractAddress() {
        return crypto.createHash('sha256')
            .update('voting_contract_' + Date.now())
            .digest('hex')
            .substring(0, 16);
    }

    isElectionActive() {
        const now = Date.now();
        return now >= this.electionStartTime && now <= this.electionEndTime && !this.isFinalized;
    }

    getElectionStatus() {
        const now = Date.now();
        if (this.isFinalized) return 'FINALIZED';
        if (now < this.electionStartTime) return 'NOT_STARTED';
        if (now > this.electionEndTime) return 'ENDED';
        return 'ACTIVE';
    }

    castVote(voterHashedId, candidateId, securedVotePacket, blockIndex) {
        const status = this.getElectionStatus();
        if (status !== 'ACTIVE') {
            return { success: false, reason: `Election is ${status}. Voting not allowed.`, code: 'INVALID_PERIOD' };
        }
        if (this.votedStudents.has(voterHashedId)) {
            const existingVote = this.votedStudents.get(voterHashedId);
            return { success: false, reason: `Student has already voted for candidate ${existingVote.candidateId}`, code: 'ALREADY_VOTED' };
        }
        if (!this.isValidCandidate(candidateId)) {
            return { success: false, reason: `Candidate ${candidateId} does not exist`, code: 'INVALID_CANDIDATE' };
        }
        this.votedStudents.set(voterHashedId, {
            candidateId: candidateId,
            timestamp: Date.now(),
            blockIndex: blockIndex,
            voteHash: securedVotePacket?.voteHash || 'pending'
        });
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

    generateTransactionId(voterHashedId, candidateId) {
        return crypto.createHash('sha256')
            .update(voterHashedId + candidateId + Date.now() + this.contractAddress)
            .digest('hex')
            .substring(0, 16);
    }

    hasVoted(voterHashedId) {
        return this.votedStudents.has(voterHashedId);
    }

    getStudentVote(voterHashedId) {
        if (!this.votedStudents.has(voterHashedId)) return null;
        const vote = this.votedStudents.get(voterHashedId);
        return { candidateId: vote.candidateId, timestamp: vote.timestamp, blockIndex: vote.blockIndex, canVerify: true };
    }

    getTally() {
        const tally = {};
        for (const [candidateId, count] of this.candidateVotes.entries()) {
            tally[candidateId] = count;
        }
        return { totalVotes: this.totalVotes, candidates: tally, lastUpdated: Date.now(), isFinalized: this.isFinalized };
    }

    isValidCandidate(candidateId) {
        const validCandidates = ['CANDIDATE_A', 'CANDIDATE_B', 'CANDIDATE_C', 'CANDIDATE_D'];
        return validCandidates.includes(candidateId);
    }

    finalizeElection() {
        if (this.isFinalized) return { success: false, reason: 'Election already finalized' };
        const status = this.getElectionStatus();
        if (status === 'ACTIVE') return { success: false, reason: 'Cannot finalize while election is active' };
        this.isFinalized = true;
        return { success: true, message: 'Election finalized', finalTally: this.getTally() };
    }

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

    verifyVote(voterHashedId, transactionId) {
        if (!this.votedStudents.has(voterHashedId)) {
            return { verified: false, reason: 'No vote found for this student' };
        }
        const vote = this.votedStudents.get(voterHashedId);
        const expectedTxId = this.generateTransactionId(voterHashedId, vote.candidateId);
        if (transactionId === expectedTxId) {
            return { verified: true, vote: { candidateId: vote.candidateId, timestamp: vote.timestamp, blockIndex: vote.blockIndex } };
        }
        return { verified: false, reason: 'Transaction ID does not match' };
    }

    getAuditLog() {
        const auditLog = [];
        for (const [voterHash, vote] of this.votedStudents.entries()) {
            auditLog.push({
                voterHash: voterHash.substring(0, 10) + '...',
                candidateId: vote.candidateId,
                timestamp: vote.timestamp,
                blockIndex: vote.blockIndex
            });
        }
        return auditLog;
    }

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