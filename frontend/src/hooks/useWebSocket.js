import { useEffect, useRef, useState, useCallback } from "react";

export function useWebSocket() {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const listenersRef = useRef(new Map());

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      // Reconnect after 3s
      setTimeout(connect, 3000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setLastMessage(msg);

        const handlers = listenersRef.current.get(msg.event);
        if (handlers) {
          handlers.forEach((fn) => fn(msg.data));
        }
      } catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  const on = useCallback((event, handler) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event).add(handler);
    return () => listenersRef.current.get(event)?.delete(handler);
  }, []);

  return { connected, lastMessage, on };
}
