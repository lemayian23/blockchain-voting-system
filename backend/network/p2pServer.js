const WebSocket = require('ws');
const crypto = require('crypto');

class P2PServer {
    constructor(blockchain, consensus, port = 5001) {
        this.blockchan = blockchain;
        this.consensus = consensus;
        this.sockets = [];
        this.port = port;
        this.nodeId = this.generateNodeId();
    }

    // Start the P2P server
    listen() {
        const server = new WebSocket.Server({ port: this.port});
        console.log(`P2P Server (Node ${this.nodeId}) listening on port ${this.port}`);

        server.on('connection', (socket) => {
            this.connectSocket(socket);
        });
    }

    // Connect to peer
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
                case 'AUTHORITY_ANNOUNCE':
                    this.handleAuthorityAnnouncement(data.authority);
                    break;
                case 'CONSENSUS_REQUEST':
                    this.handleConsensusRequest(socket);
                    break;
                default:
                    console.log(`Unkwown message type: ${data.type}`);
            }
        });
    }

    //Broadcast new vote all peers
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
        console.log(`Broadcast vote to ${this.sockets.length} peers`);
    }

    //Broadcast new block to all peers
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
        console.log(`Broadcasted block ${block.index} to ${this.sockets.length} peers `);
    }
}