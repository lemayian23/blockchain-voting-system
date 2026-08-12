const Blockchain = require('./blockchain/blockchain');
const Consensus = require('./network/consensus');
const VotingContract = require('./smartcontract/votingContract');
const VoteEncryption = require('./crypto/voteEncryption');
const db = require('./db/queries');

let blockchain, consensus, cryptoSystem, electionKeys, votingContract;

async function initSystem() {
    const settings = await db.getElectionSettings();
    let startTime, endTime;
    if (settings) {
        startTime = new Date(settings.start_time).getTime();
        endTime = new Date(settings.end_time).getTime();
    } else {
        const now = Date.now();
        startTime = now;
        endTime = now + 24 * 60 * 60 * 1000;
        await db.updateElectionSettings(new Date(startTime), new Date(endTime));
    }

    blockchain = new Blockchain(2);
    consensus = new Consensus();
    cryptoSystem = new VoteEncryption();
    electionKeys = cryptoSystem.generateElectionAuthorityKeys();
    votingContract = new VotingContract(startTime, endTime);

    consensus.registerAuthority('node_auth_001', 'University Server - Main');
    consensus.registerAuthority('node_auth_002', 'University Server - Backup');
    consensus.registerAuthority('node_auth_003', 'University Server - Audit');

    // store globally for routes
    global.blockchain = blockchain;
    global.consensus = consensus;
    global.cryptoSystem = cryptoSystem;
    global.electionKeys = electionKeys;
    global.votingContract = votingContract;

    return { blockchain, consensus, votingContract };
}

module.exports = { initSystem, blockchain, consensus, votingContract };