import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store room state in memory
// Map<workspaceId, { blocks: Block[] }>
const workspaces = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  let currentRoom = null;

  socket.on('join-workspace', (workspaceId, callback) => {
    // Leave previous room if any
    if (currentRoom) {
      socket.leave(currentRoom);
    }
    
    socket.join(workspaceId);
    currentRoom = workspaceId;
    
    if (!workspaces.has(workspaceId)) {
      // Initialize empty workspace
      workspaces.set(workspaceId, {
        blocks: []
      });
    }

    const roomState = workspaces.get(workspaceId);
    
    // Acknowledge join and send current state
    if (callback) {
      callback({
        blocks: roomState.blocks,
      });
    }

    // Broadcast user joined
    socket.to(workspaceId).emit('user-joined', { userId: socket.id });
    console.log(`User ${socket.id} joined ${workspaceId}`);
  });

  socket.on('add-block', (block) => {
    if (!currentRoom) return;
    const roomState = workspaces.get(currentRoom);
    if (roomState) {
      roomState.blocks.push(block);
      socket.to(currentRoom).emit('block-added', block);
    }
  });

  socket.on('update-block', (block) => {
    if (!currentRoom) return;
    const roomState = workspaces.get(currentRoom);
    if (roomState) {
      const idx = roomState.blocks.findIndex(b => b.id === block.id);
      if (idx !== -1) {
        roomState.blocks[idx] = block;
      } else {
        roomState.blocks.push(block);
      }
      socket.to(currentRoom).emit('block-updated', block);
    }
  });

  socket.on('delete-block', (id) => {
    if (!currentRoom) return;
    const roomState = workspaces.get(currentRoom);
    if (roomState) {
      roomState.blocks = roomState.blocks.filter(b => b.id !== id);
      // Clean up references
      roomState.blocks = roomState.blocks.map(b => {
        const next = { ...b };
        if (next.targetId === id) next.targetId = '';
        if (next.yesTargetId === id) next.yesTargetId = '';
        if (next.noTargetId === id) next.noTargetId = '';
        return next;
      });
      socket.to(currentRoom).emit('block-deleted', id);
    }
  });

  socket.on('clear-blocks', () => {
    if (!currentRoom) return;
    const roomState = workspaces.get(currentRoom);
    if (roomState) {
      roomState.blocks = [];
      socket.to(currentRoom).emit('blocks-cleared');
    }
  });

  socket.on('full-sync', (blocks) => {
    if (!currentRoom) return;
    const roomState = workspaces.get(currentRoom);
    if (roomState) {
      roomState.blocks = blocks;
      socket.to(currentRoom).emit('full-sync-update', blocks);
    }
  });

  // Cursor and selection Presence
  socket.on('cursor-move', (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('cursor-update', { ...data, userId: socket.id });
  });

  socket.on('node-select', (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('selection-update', { ...data, userId: socket.id });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    if (currentRoom) {
      socket.to(currentRoom).emit('user-left', { userId: socket.id });
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
