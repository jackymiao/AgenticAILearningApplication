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
  const [status, setStatus] = useState("idle");
  const [lastError, setLastError] = useState("");
  const reconnectTimeout = useRef(null);
  const heartbeatInterval = useRef(null);
  const reconnectCount = useRef(0);

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
    if (!projectCode || !userName) {
      setConnected(false);
      setStatus("idle");
      setLastError("");
      return;
    }

    const connect = (isReconnect = false) => {
      setStatus(isReconnect ? "reconnecting" : "connecting");
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const API_BASE = import.meta.env.VITE_API_BASE || "/api";

      if (import.meta.env.DEBUG === "1") {
        console.log("[WS] API_BASE:", API_BASE);
      }

      // Determine WebSocket URL based on API_BASE
      let wsUrl;
      if (API_BASE.startsWith("http://") || API_BASE.startsWith("https://")) {
        // Production: Use backend URL (VITE_API_BASE is full URL like https://backend.com/api)
        const backendUrl = new URL(API_BASE);
        wsUrl = `${protocol}//${backendUrl.hostname}${backendUrl.port ? ":" + backendUrl.port : ""}/ws`;
      } else {
        // Development: Use localhost:3000
        wsUrl = `${protocol}//${window.location.hostname}:3000/ws`;
      }

      if (import.meta.env.DEBUG === "1") {
        console.log("[WS] Connecting to:", wsUrl);
      }
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        if (import.meta.env.DEBUG === "1") {
          console.log("[WS] Connected");
        }
        setConnected(true);
        setStatus("connected");
        setLastError("");
        reconnectCount.current = 0;

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
        setStatus("disconnected");

        // Clear heartbeat
        if (heartbeatInterval.current) {
          clearInterval(heartbeatInterval.current);
          heartbeatInterval.current = null;
        }

        // Attempt reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(() => {
          reconnectCount.current += 1;
          if (import.meta.env.DEBUG === "1") {
            console.log("[WS] Reconnecting...");
          }
          connect(true);
        }, 3000);
      };

      ws.current.onerror = (error) => {
        setStatus("error");
        setLastError(
          "Real-time connection failed. Check your network, disable privacy/ad-blocker for this site, and refresh.",
        );
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

  return {connected, status, lastError};
}
