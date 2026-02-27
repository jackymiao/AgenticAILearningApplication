import {useEffect, useRef, useState} from "react";

export function useWebSocket(
  projectCode,
  userName,
  onAttackReceived,
  onTokenUpdate,
  onAttackResult,
) {
  const ws = useRef(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimeout = useRef(null);
  const heartbeatInterval = useRef(null);

  // Use refs to capture latest callbacks without causing reconnects
  const onAttackReceivedRef = useRef(onAttackReceived);
  const onTokenUpdateRef = useRef(onTokenUpdate);
  const onAttackResultRef = useRef(onAttackResult);

  // Update refs when callbacks change
  useEffect(() => {
    onAttackReceivedRef.current = onAttackReceived;
  }, [onAttackReceived]);

  useEffect(() => {
    onTokenUpdateRef.current = onTokenUpdate;
  }, [onTokenUpdate]);

  useEffect(() => {
    onAttackResultRef.current = onAttackResult;
  }, [onAttackResult]);

  useEffect(() => {
    if (!projectCode || !userName) return;

    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

      // With proxy, WebSocket is on same origin at /ws
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      if (import.meta.env.DEBUG === "1") {
        console.log("[WS] Connecting to:", wsUrl);
      }
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        if (import.meta.env.DEBUG === "1") {
          console.log("[WS] Connected");
        }
        setConnected(true);

        // Register with project and userName
        ws.current.send(
          JSON.stringify({
            type: "register",
            projectCode,
            userName,
          }),
        );

        // Start heartbeat
        heartbeatInterval.current = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({type: "heartbeat"}));
          }
        }, 25000); // Every 25 seconds
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (import.meta.env.DEBUG === "1") {
            console.log("[WS] Message received:", message);
          }

          switch (message.type) {
            case "registered":
              if (import.meta.env.DEBUG === "1") {
                console.log("[WS] Registration confirmed");
              }
              break;

            case "incoming_attack":
              if (import.meta.env.DEBUG === "1") {
                console.log("[WS] Incoming attack!", message.attackId);
              }
              if (onAttackReceivedRef.current) {
                onAttackReceivedRef.current(message.attackId);
              }
              break;

            case "attack_result":
              if (import.meta.env.DEBUG === "1") {
                console.log("[WS] Attack result:", message);
              }
              if (onAttackResultRef.current) {
                onAttackResultRef.current(message);
              }
              break;

            case "token_update":
              if (import.meta.env.DEBUG === "1") {
                console.log("[WS] Token update:", message.tokens);
              }
              if (onTokenUpdateRef.current) {
                onTokenUpdateRef.current(message.tokens);
              }
              break;

            case "heartbeat_ack":
              // Silent acknowledgment
              break;

            default:
              if (import.meta.env.DEBUG === "1") {
                console.log("[WS] Unknown message type:", message.type);
              }
          }
        } catch (error) {
          console.error("[WS] Error parsing message:", error);
        }
      };

      ws.current.onclose = () => {
        if (import.meta.env.DEBUG === "1") {
          console.log("[WS] Disconnected");
        }
        setConnected(false);

        // Clear heartbeat
        if (heartbeatInterval.current) {
          clearInterval(heartbeatInterval.current);
          heartbeatInterval.current = null;
        }

        // Attempt reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(() => {
          if (import.meta.env.DEBUG === "1") {
            console.log("[WS] Reconnecting...");
          }
          connect();
        }, 3000);
      };

      ws.current.onerror = (error) => {
        console.error("[WS] Error:", error);
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

  return {connected};
}
