import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Serve frontend in production
app.use(express.static(path.join(__dirname, 'dist')));

// Store current flowchart state in-memory on the server
let currentBlocks = [];

// HTTP Server
const server = createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
  console.log('New client connected to collaborative canvas');

  // Send current state to the newly connected client
  ws.send(JSON.stringify({ type: 'init', blocks: currentBlocks }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'update') {
        currentBlocks = data.blocks;
        
        // Broadcast the update to all OTHER connected clients
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'update', blocks: currentBlocks }));
          }
        });
      }
    } catch (e) {
      console.error('Error parsing collaborative message:', e);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected from collaborative canvas');
  });
});

// Upgrade HTTP to WS at /ws path
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log("Server with WebSocket is running on port " + PORT);
});
