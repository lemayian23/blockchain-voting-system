const WebSocket = require('ws');
const { votingContract } = require('../init');

let wss;

function setupWebSocket(server) {
    wss = new WebSocket.Server({ server });
    wss.on('connection', (ws) => {
        console.log('WebSocket client connected');
        // Send initial tally
        ws.send(JSON.stringify({ type: 'tally', data: votingContract.getTally() }));

        // Listen for close
        ws.on('close', () => console.log('WebSocket client disconnected'));
    });

    // Broadcast tally updates every 5 seconds (or on new vote)
    setInterval(() => {
        const tally = votingContract.getTally();
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'tally', data: tally }));
            }
        });
    }, 5000);
}

// Function to notify on new vote (call from vote route)
function broadcastTally() {
    const tally = votingContract.getTally();
    wss?.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'tally', data: tally }));
        }
    });
}

module.exports = { setupWebSocket, broadcastTally };