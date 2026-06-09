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
}