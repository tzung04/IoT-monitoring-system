import api from "./apiClient";

const BASE = "/auth";

export const login = async (username, password) => {
  try {
    // Backend trả về: { message, user, token }
    const resp = await api.post(`${BASE}/login`, { username, password });
    return resp.data;
  } catch (err) {
    console.error("Login error", err);
    throw err;
  }
};

export const register = async (username, email, password) => {
  try {
    const resp = await api.post(`${BASE}/register`, { username, email, password });
    return resp.data;
  } catch (err) {
    console.error("Register error", err);
    throw err;
  }
};

export const getCurrentUser = async () => {
  try {
    // Endpoint /me yêu cầu token (đã được apiClient tự động đính kèm qua interceptor)
    const resp = await api.get(`${BASE}/me`);
    return resp.data;
  } catch (err) {
    console.error("Get current user error", err);
    throw err;
  }
};

export const changePassword = async (currentPassword, newPassword) => {
  try {
    const resp = await api.put(`${BASE}/change-password`, { currentPassword, newPassword });
    return resp.data;
  } catch (err) {
    console.error("Change password error", err);
    throw err;
  }
};

export default {
  login,
  register,
  getCurrentUser,
  changePassword,
};