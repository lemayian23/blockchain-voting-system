const WebSocket = require('ws');
const crypto = require('crypto');

class P2PServer {
    constructor(blockchain, consensus, port = 5001) {
        this.blockchain = blockchain;
        this.consensus = consensus;
        this.sockets = [];
        this.port = port;
        this.nodeId = this.generateNodeId();
    }

    generateNodeId() {
        return crypto.randomBytes(8).toString('hex');
    }

    // Start the P2P server
    listen() {
        const server = new WebSocket.Server({ port: this.port });
        console.log(`P2P Server (Node ${this.nodeId}) listening on port ${this.port}`);
        
        server.on('connection', (socket) => {
            this.connectSocket(socket);
        });
    }

    // Connect to a peer
    connectToPeer(peerUrl) {
        const socket = new WebSocket(peerUrl);
        
        socket.on('open', () => {
            console.log(`Connected to peer: ${peerUrl}`);
            this.connectSocket(socket);
        });
        
        socket.on('error', (error) => {
            console.error(`Connection error to ${peerUrl}:`, error.message);
        });
    }

    connectSocket(socket) {
        this.sockets.push(socket);
        this.messageHandler(socket);
        this.sendChain(socket);
    }

    messageHandler(socket) {
        socket.on('message', (message) => {
            const data = JSON.parse(message);
            console.log(`Received: ${data.type}`);
            
            switch(data.type) {
                case 'CHAIN':
                    this.handleChainMessage(data.chain);
                    break;
                case 'VOTE':
                    this.handleVoteMessage(data.vote);
                    break;
                case 'BLOCK':
                    this.handleBlockMessage(data.block);
                    break;
                case 'AUTHORITY_ANNOUNCE':
                    this.handleAuthorityAnnouncement(data.authority);
                    break;
                case 'CONSENSUS_REQUEST':
                    this.handleConsensusRequest(socket);
                    break;
                default:
                    console.log(`Unknown message type: ${data.type}`);
            }
        });
    }

    // Broadcast new vote to all peers
    broadcastVote(vote) {
        const message = JSON.stringify({
            type: 'VOTE',
            vote: vote,
            nodeId: this.nodeId,
            timestamp: Date.now()
        });
        
        this.sockets.forEach(socket => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(message);
            }
        });
        console.log(`Broadcasted vote to ${this.sockets.length} peers`);
    }

    // Broadcast new block to all peers
    broadcastBlock(block) {
        const message = JSON.stringify({
            type: 'BLOCK',
            block: block,
            nodeId: this.nodeId,
            timestamp: Date.now()
        });
        
        this.sockets.forEach(socket => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(message);
            }
        });
        console.log(`Broadcasted block ${block.index} to ${this.sockets.length} peers`);
    }

    // Send current blockchain to a specific socket
    sendChain(socket) {
        const message = JSON.stringify({
            type: 'CHAIN',
            chain: this.blockchain.chain,
            nodeId: this.nodeId
        });
        socket.send(message);
    }

    // Handle incoming chain from peer
    handleChainMessage(chain) {
        this.blockchain.replaceChain(chain);
    }

    // Handle incoming vote
    handleVoteMessage(vote) {
        console.log("New vote received from peer network");
        this.blockchain.addVote(vote);
    }

    // Handle incoming block
    handleBlockMessage(block) {
        console.log(`New block ${block.index} received from peer`);
        
        // Verify block is signed by valid authority
        const expectedAuthority = this.consensus.getNextAuthority();
        if (expectedAuthority && this.consensus.verifyBlockAuthority(block, expectedAuthority.address)) {
            this.blockchain.chain.push(block);
            console.log(`Block ${block.index} accepted and added to chain`);
        } else {
            console.log(`Block ${block.index} rejected - invalid authority signature`);
        }
    }

    // Announce this node as an authority
    announceAsAuthority(authorityName) {
        const authority = {
            address: this.nodeId,
            name: authorityName,
            nodeId: this.nodeId,
            timestamp: Date.now()
        };
        
        const message = JSON.stringify({
            type: 'AUTHORITY_ANNOUNCE',
            authority: authority
        });
        
        this.sockets.forEach(socket => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(message);
            }
        });
        
        // Register locally
        this.consensus.registerAuthority(this.nodeId, authorityName);
        console.log(`Announced as authority: ${authorityName}`);
    }

    handleAuthorityAnnouncement(authority) {
        console.log(`Authority announcement from: ${authority.name}`);
        this.consensus.registerAuthority(authority.address, authority.name);
    }

    handleConsensusRequest(socket) {
        // Send current chain for consensus comparison
        this.sendChain(socket);
    }

    // Request consensus from all peers
    requestConsensus() {
        const peerChains = [];
        
        // This would collect chains from all peers
        // Simplified for demo
        console.log("Consensus requested - would collect chains from all peers");
        return peerChains;
    }

    getNetworkStatus() {
        return {
            nodeId: this.nodeId,
            activePeers: this.sockets.filter(s => s.readyState === WebSocket.OPEN).length,
            totalPeers: this.sockets.length,
            port: this.port
        };
    }
}

module.exports = P2PServer;