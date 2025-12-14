const WS_URL = process.env.REACT_APP_WS_URL || "ws://localhost:5000";

let socket = null;
const listeners = new Set();

const ensureConnection = () => {
  if (socket && socket.readyState === WebSocket.OPEN) return socket;

  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.info("WebSocket connected", WS_URL);
  };

  socket.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      listeners.forEach((cb) => cb(parsed));
    } catch (err) {
      console.error("WebSocket parse error", err, event.data);
    }
  };

  socket.onclose = () => {
    console.warn("WebSocket closed, retrying in 3s");
    setTimeout(ensureConnection, 3000);
  };

  socket.onerror = (err) => {
    console.error("WebSocket error", err);
    socket.close();
  };

  return socket;
};

export const subscribe = (callback) => {
  ensureConnection();
  listeners.add(callback);
  return () => listeners.delete(callback);
};

export const getSocket = () => ensureConnection();

export default { subscribe, getSocket };
