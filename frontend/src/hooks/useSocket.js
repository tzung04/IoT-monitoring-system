import { useEffect, useRef } from "react";
import websocketService from "../services/websocket";

const useSocket = (onMessage) => {
  const handlerRef = useRef(onMessage);

  useEffect(() => {
    handlerRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    // Subscribe to shared WebSocket stream
    const unsubscribe = websocketService.subscribe((payload) => {
      if (handlerRef.current) {
        handlerRef.current(payload);
      }
    });

    // Ensure connection is established immediately
    websocketService.getSocket();

    return () => {
      unsubscribe();
    };
  }, []);
};

export default useSocket;
