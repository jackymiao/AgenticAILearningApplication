import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface WSClient extends WebSocket {
  projectCode?: string;
  userName?: string;
  isAlive?: boolean;
}

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Track connections by project and user
  const connections = new Map<string, Map<string, WSClient>>();

  // Heartbeat to detect dead connections
  const heartbeat = function(this: WSClient) {
    this.isAlive = true;
  };

  // Clean up dead connections every 30s
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WSClient) => {
      if (ws.isAlive === false) {
        console.log('[WS] Terminating dead connection:', ws.userName);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  wss.on('connection', (ws: WSClient) => {
    console.log('[WS] New connection established');
    ws.isAlive = true;
    ws.on('pong', heartbeat);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'register':
            // Register user to a project
            const { projectCode, userName } = message;
            ws.projectCode = projectCode;
            ws.userName = userName;
            
            if (!connections.has(projectCode)) {
              connections.set(projectCode, new Map());
            }
            connections.get(projectCode)!.set(userName, ws);
            
            console.log(`[WS] Registered: ${userName} in project ${projectCode}`);
            ws.send(JSON.stringify({ type: 'registered', success: true }));
            break;

          case 'heartbeat':
            // Keep connection alive
            ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
            break;

          default:
            console.log('[WS] Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('[WS] Error processing message:', error);
      }
    });

    ws.on('close', () => {
      if (ws.projectCode && ws.userName) {
        const projectConnections = connections.get(ws.projectCode);
        if (projectConnections) {
          projectConnections.delete(ws.userName);
          console.log(`[WS] Disconnected: ${ws.userName} from project ${ws.projectCode}`);
        }
      }
    });

    ws.on('error', (error) => {
      console.error('[WS] WebSocket error:', error);
    });
  });

  // Helper function to send attack notification to a specific user
  const sendAttackNotification = (projectCode: string, targetUserName: string, attackId: string) => {
    const projectConnections = connections.get(projectCode);
    if (projectConnections) {
      const targetWs = projectConnections.get(targetUserName);
      if (targetWs && targetWs.readyState === 1) { // OPEN
        targetWs.send(JSON.stringify({
          type: 'incoming_attack',
          attackId,
          expiresIn: 15000 // 15 seconds
        }));
        console.log(`[WS] Attack notification sent to ${targetUserName}`);
        return true;
      }
    }
    return false;
  };

  // Helper function to send attack result to attacker
  const sendAttackResult = (projectCode: string, attackerUserName: string, result: any) => {
    const projectConnections = connections.get(projectCode);
    if (projectConnections) {
      const attackerWs = projectConnections.get(attackerUserName);
      if (attackerWs && attackerWs.readyState === 1) {
        attackerWs.send(JSON.stringify({
          type: 'attack_result',
          ...result
        }));
        console.log(`[WS] Attack result sent to ${attackerUserName}`);
      }
    }
  };

  // Helper function to broadcast token updates to a user
  const broadcastTokenUpdate = (projectCode: string, userName: string, tokens: any) => {
    const projectConnections = connections.get(projectCode);
    if (projectConnections) {
      const userWs = projectConnections.get(userName);
      if (userWs && userWs.readyState === 1) {
        userWs.send(JSON.stringify({
          type: 'token_update',
          tokens
        }));
      }
    }
  };

  console.log('[WS] WebSocket server initialized on /ws');

  return {
    wss,
    sendAttackNotification,
    sendAttackResult,
    broadcastTokenUpdate
  };
}
