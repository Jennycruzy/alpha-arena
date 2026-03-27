"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";

// In production: Defaults to the DuckDNS VPS WebSocket
// In dev: fallback to ws://localhost:4000/ws
function getWsUrl() {
    if (typeof window === "undefined") return null;
    const envUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL;
    if (envUrl) return envUrl;

    // For Vercel production deployments, use the DuckDNS VPS over secure WSS
    if (process.env.NODE_ENV === "production") {
        return "wss://alpha-arena.duckdns.org/ws";
    }

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//localhost:4000/ws`;
}
const WS_URL = getWsUrl();


export function useWebSocket() {
    const wsRef = useRef(null);
    const listenersRef = useRef(new Map());
    const reconnectTimer = useRef(null);
    const [connected, setConnected] = useState(false);

    const connect = useCallback(() => {
        if (!WS_URL) return;
        if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) return;

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            setConnected(true);
            if (reconnectTimer.current) {
                clearTimeout(reconnectTimer.current);
                reconnectTimer.current = null;
            }
        };

        ws.onclose = () => {
            setConnected(false);
            reconnectTimer.current = setTimeout(connect, 3000);
        };

        ws.onerror = () => ws.close();

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                const handlers = listenersRef.current.get(msg.event);
                if (handlers) handlers.forEach((fn) => fn(msg.data));
            } catch {
                // ignore
            }
        };
    }, []);

    useEffect(() => {
        connect();
        return () => {
            wsRef.current?.close();
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        };
    }, [connect]);

    const on = useCallback((event, handler) => {
        if (!listenersRef.current.has(event)) {
            listenersRef.current.set(event, new Set());
        }
        listenersRef.current.get(event).add(handler);
        return () => listenersRef.current.get(event)?.delete(handler);
    }, []);

    const send = useCallback((event, data) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ event, data }));
        }
    }, []);

    const value = useMemo(() => ({ connected, on, send }), [connected, on, send]);
    return value;
}
