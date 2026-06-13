const http = require('http');
const url = require('url');
const fs = require('path');

// Import our blockchain modules
const Blockchain = require('../blockchain/blockchain');
const Consensus = require('../networkk/consensus');
const VotingContract = require('../smartContract/votingContract');
const VoteEncryption = require('..crypto/voteEncryption');


//Initialize system
const blockchain = new Blockchain(2);
const consensus = new Consensus();
const cryptoSystem = new VoteEncryption();
const electionKeys = cryptoSystem.generateElectionAuthorityKeys();

// Election period: now open for 24hours
const startTime = Date.now();
const endTime = startTime + (24 * 60 * 60 * 1000);
const votingContract = new VotingContract(startTime, endTime);