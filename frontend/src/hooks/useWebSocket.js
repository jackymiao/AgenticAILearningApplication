import { useEffect, useRef, useState } from 'react';

export function useWebSocket(projectCode, userName, onAttackReceived, onTokenUpdate, onAttackResult) {
  const ws = useRef(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimeout = useRef(null);
  const heartbeatInterval = useRef(null);

  useEffect(() => {
    if (!projectCode || !userName) return;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const API_BASE = import.meta.env.VITE_API_BASE || '/api';
      
      // Determine WebSocket URL based on API_BASE
      let wsUrl;
      if (API_BASE.startsWith('http')) {
        // Production: Use backend URL
        const backendUrl = new URL(API_BASE);
        wsUrl = `${protocol}//${backendUrl.host}/ws`;
      } else {
        // Development: Use localhost:3000
        wsUrl = `${protocol}//${window.location.hostname}:3000/ws`;
      }
      
      console.log('[WS] Connecting to:', wsUrl);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('[WS] Connected');
        setConnected(true);
        
        // Register with project and userName
        ws.current.send(JSON.stringify({
          type: 'register',
          projectCode,
          userName
        }));

        // Start heartbeat
        heartbeatInterval.current = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'heartbeat' }));
          }
        }, 25000); // Every 25 seconds
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[WS] Message received:', message);

          switch (message.type) {
            case 'registered':
              console.log('[WS] Registration confirmed');
              break;
              
            case 'incoming_attack':
              console.log('[WS] Incoming attack!', message.attackId);
              if (onAttackReceived) {
                onAttackReceived(message.attackId);
              }
              break;
              
            case 'attack_result':
              console.log('[WS] Attack result:', message);
              if (onAttackResult) {
                onAttackResult(message);
              }
              break;
              
            case 'token_update':
              console.log('[WS] Token update:', message.tokens);
              if (onTokenUpdate) {
                onTokenUpdate(message.tokens);
              }
              break;
              
            case 'heartbeat_ack':
              // Silent acknowledgment
              break;
              
            default:
              console.log('[WS] Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('[WS] Error parsing message:', error);
        }
      };

      ws.current.onclose = () => {
        console.log('[WS] Disconnected');
        setConnected(false);
        
        // Clear heartbeat
        if (heartbeatInterval.current) {
          clearInterval(heartbeatInterval.current);
          heartbeatInterval.current = null;
        }
        
        // Attempt reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(() => {
          console.log('[WS] Reconnecting...');
          connect();
        }, 3000);
      };

      ws.current.onerror = (error) => {
        console.error('[WS] Error:', error);
      };
    };

    connect();

    // Cleanup
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [projectCode, userName]);

  return { connected };
}
