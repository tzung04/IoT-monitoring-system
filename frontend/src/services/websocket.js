// WebSocket disabled - backend không hỗ trợ WebSocket lúc này
// Sử dụng HTTP polling thay thế
const WS_ENABLED = false;

let socket = null;
const listeners = new Set();

const ensureConnection = () => {
  // WebSocket is permanently disabled
  return null;
};

export const subscribe = (callback) => {
  const socket = ensureConnection();
  if (!socket) {
    // Return no-op unsubscribe
    return () => {};
  }
  
  listeners.add(callback);
  return () => listeners.delete(callback);
};

export const getSocket = () => ensureConnection();

export const disconnect = () => {
  if (socket) {
    socket.close();
    socket = null;
  }
};

export default { subscribe, getSocket, disconnect };
