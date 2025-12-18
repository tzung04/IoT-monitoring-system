import { useEffect, useRef } from "react";
import websocketService from "../services/websocket";

const useSocket = (onMessage) => {
  const handlerRef = useRef(onMessage);

  useEffect(() => {
    handlerRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!onMessage) return;

    try {
      // Subscribe to shared WebSocket stream
      const unsubscribe = websocketService.subscribe((payload) => {
        if (handlerRef.current) {
          handlerRef.current(payload);
        }
      });

      // Try to establish connection (non-blocking)
      websocketService.getSocket();

      return () => {
        try {
          unsubscribe();
        } catch (err) {
          console.error("Error unsubscribing from WebSocket:", err);
        }
      };
    } catch (err) {
      console.error("Error in useSocket:", err);
      // Don't throw - let components work without WebSocket
      return () => {};
    }
  }, []);
};

export default useSocket;
