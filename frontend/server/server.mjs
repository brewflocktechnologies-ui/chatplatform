import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

const PORT = process.env.PORT || 8088;

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ChatPlatform Standalone WebSocket Hub is running.');
});

const wss = new WebSocketServer({ server });

/**
 * Map of roomKey -> Set of client sockets
 * roomKey format: `${tenantId}:${conversationId}`
 */
const rooms = new Map();

/**
 * Set of agent sockets that receive all tenant events
 */
const tenantAgents = new Map(); // tenantId -> Set<WebSocket>

/**
 * Map of socket -> metadata
 */
const clientMeta = new WeakMap();

function getRoomKey(tenantId, conversationId) {
  return `${tenantId || 'default'}:${conversationId || 'general'}`;
}

function broadcastToRoom(roomKey, data, senderSocket = null) {
  const room = rooms.get(roomKey);
  const payload = typeof data === 'string' ? data : JSON.stringify(data);

  if (room) {
    for (const client of room) {
      if (client !== senderSocket && client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  // Also broadcast to agents listening on this tenant (or fallback to demo-tenant)
  const tenantId = data.tenantId || 'demo-tenant';
  let agents = tenantAgents.get(tenantId);
  if (!agents && tenantId !== 'demo-tenant') {
    agents = tenantAgents.get('demo-tenant');
  }

  if (agents) {
    for (const agent of agents) {
      if (agent !== senderSocket && (!room || !room.has(agent)) && agent.readyState === WebSocket.OPEN) {
        agent.send(payload);
      }
    }
  }
}

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`[WS] Client connected from ${ip}`);

  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const { type, tenantId, conversationId } = msg;

      switch (type) {
        case 'join': {
          const roomKey = getRoomKey(tenantId, conversationId);
          if (!rooms.has(roomKey)) {
            rooms.set(roomKey, new Set());
          }
          rooms.get(roomKey).add(ws);

          if (msg.role === 'agent') {
            const tId = tenantId || 'demo-tenant';
            if (!tenantAgents.has(tId)) {
              tenantAgents.set(tId, new Set());
            }
            tenantAgents.get(tId).add(ws);
          }

          clientMeta.set(ws, {
            roomKey,
            tenantId,
            conversationId,
            role: msg.role || 'visitor',
            senderName: msg.senderName || 'Anonymous'
          });

          console.log(
            `[WS] ${msg.role || 'client'} "${msg.senderName}" joined room: ${roomKey}`
          );

          // Notify room and agents about presence
          broadcastToRoom(
            roomKey,
            {
              type: 'presence',
              tenantId,
              conversationId,
              status: 'online',
              role: msg.role || 'visitor',
              senderName: msg.senderName
            },
            ws
          );

          ws.send(
            JSON.stringify({
              type: 'joined',
              roomKey,
              status: 'connected'
            })
          );
          break;
        }

        case 'update_name': {
          const roomKey = getRoomKey(tenantId, conversationId);
          const meta = clientMeta.get(ws);
          if (meta) {
            meta.senderName = msg.senderName;
          }

          console.log(`[WS] Name updated in ${roomKey}: "${msg.senderName}"`);

          broadcastToRoom(
            roomKey,
            {
              type: 'update_name',
              tenantId,
              conversationId,
              senderName: msg.senderName
            },
            ws
          );
          break;
        }

        case 'chat_message': {
          const roomKey = getRoomKey(tenantId, conversationId);
          console.log(
            `[WS] Message in ${roomKey} from ${msg.message?.author || msg.senderName}: ${msg.message?.text}`
          );

          broadcastToRoom(
            roomKey,
            {
              type: 'chat_message',
              tenantId,
              conversationId,
              senderName: msg.senderName || msg.message?.author,
              message: msg.message
            },
            ws
          );
          break;
        }

        case 'typing_status': {
          const roomKey = getRoomKey(tenantId, conversationId);
          broadcastToRoom(
            roomKey,
            {
              type: 'typing_status',
              tenantId,
              conversationId,
              isTyping: !!msg.isTyping,
              senderName: msg.senderName
            },
            ws
          );
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        }

        default:
          console.warn(`[WS] Unknown message type: ${type}`);
      }
    } catch (err) {
      console.error('[WS] Error processing message:', err);
    }
  });

  ws.on('close', () => {
    const meta = clientMeta.get(ws);
    if (meta) {
      const { roomKey, tenantId, conversationId, role, senderName } = meta;
      const room = rooms.get(roomKey);
      if (room) {
        room.delete(ws);
        if (room.size === 0) {
          rooms.delete(roomKey);
        }
      }

      if (role === 'agent') {
        const tId = tenantId || 'demo-tenant';
        const agents = tenantAgents.get(tId);
        if (agents) {
          agents.delete(ws);
        }
      }

      console.log(`[WS] ${role} "${senderName}" left room: ${roomKey}`);

      broadcastToRoom(roomKey, {
        type: 'presence',
        tenantId,
        conversationId,
        status: 'offline',
        role,
        senderName
      });
    }
  });

  ws.on('error', (err) => {
    console.error('[WS] Socket error:', err);
  });
});

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

server.listen(PORT, () => {
  console.log(`
=====================================================
⚡ ChatPlatform Standalone WebSocket Server
📡 Listening on ws://localhost:${PORT}
🚀 Multi-room & Dynamic Visitor Support Active
=====================================================
  `);
});
