const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3001 });

wss.on('connection', (ws) => {
  // When a new client connects, send a welcome message
  ws.send('Welcome to the chat!');

  // Listen for messages from the client
  ws.on('message', (message) => {
    console.log(`Received: ${message}`);

    // Broadcast the received message to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        // Ensure the message is sent as a string
        client.send(`Support: ${message.toString()}`);  // Send message as text
      }
    });
  });

  // Log when a client disconnects
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

console.log('WebSocket server running on ws://localhost:3001');
