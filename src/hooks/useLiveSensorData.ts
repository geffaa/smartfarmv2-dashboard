"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getNotificationWsUrl } from "@/lib/api";

export interface LiveSensorReading {
    id: string;
    kandang_id: string;
    timestamp: string;
    hari_ke: number;
    suhu: number;
    kelembaban: number;
    amoniak: number;
    pakan: number | null;
    minum: number | null;
    populasi: number | null;
    bobot: number | null;
    death: number | null;
    auto_prediction?: {
        classification?: {
            prediction: string;
            confidence: number;
            is_abnormal: boolean;
        };
        forecasting?: {
            predicted_death: number;
            has_risk: boolean;
        };
    };
}

/**
 * Hook that connects to the WebSocket and provides live sensor data pushed from the backend.
 * 
 * When the backend POSTs new sensor data, it broadcasts via WebSocket.
 * This hook receives those events and prepends them to the data array.
 * 
 * Also provides a callback `onNewData` for parent components to react to live data.
 */
export function useLiveSensorData(onNewData?: (data: LiveSensorReading) => void) {
    const { data: session, status } = useSession();
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
    const onNewDataRef = useRef(onNewData);
    onNewDataRef.current = onNewData;

    const [connected, setConnected] = useState(false);
    const [liveReadings, setLiveReadings] = useState<LiveSensorReading[]>([]);
    const [lastReceived, setLastReceived] = useState<Date | null>(null);

    const connect = useCallback(() => {
        if (!session?.accessToken || status !== "authenticated") return;

        // Don't reconnect if already open
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

        const url = getNotificationWsUrl(session.accessToken);
        const ws = new WebSocket(url);

        ws.onopen = () => {
            setConnected(true);
            console.log("🔗 WebSocket connected for live sensor data");
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                if (message.type === "sensor_data" && message.data) {
                    const reading = message.data as LiveSensorReading;
                    setLiveReadings(prev => [reading, ...prev]);
                    setLastReceived(new Date());

                    // Call parent callback
                    onNewDataRef.current?.(reading);
                }
                // Also handle "pong" messages silently
            } catch (e) {
                // Non-JSON messages (like "pong") are fine
            }
        };

        ws.onclose = () => {
            setConnected(false);
            console.log("🔌 WebSocket disconnected, will reconnect...");
            // Reconnect after 3 seconds
            reconnectTimerRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
            ws.close();
        };

        wsRef.current = ws;
    }, [session?.accessToken, status]);

    // Setup ping keep-alive
    useEffect(() => {
        const pingInterval = setInterval(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send("ping");
            }
        }, 30000);

        return () => clearInterval(pingInterval);
    }, []);

    // Connect on mount
    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            if (wsRef.current) {
                wsRef.current.onclose = null; // Prevent reconnect on intentional close
                wsRef.current.close();
            }
        };
    }, [connect]);

    const clearLiveReadings = useCallback(() => {
        setLiveReadings([]);
    }, []);

    return { connected, liveReadings, lastReceived, clearLiveReadings };
}
