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
    console.log('Calling register API with:', { username, email });
    const resp = await api.post(`${BASE}/register`, { username, email, password });
    console.log('Register response:', resp.data);
    return resp.data;
  } catch (err) {
    console.error("Register error:", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
      stack: err.stack
    });
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

export const forgotPassword = async (email) => {
  try {
    // Gửi email yêu cầu reset password
    const resp = await api.post(`${BASE}/forgot-password`, { email });
    return resp.data;
  } catch (err) {
    console.error("Forgot password error", err);
    throw err;
  }
};

export const resetPassword = async (email, code, newPassword) => {
  try {
    // Reset password với email, code, và password mới
    const resp = await api.post(`${BASE}/reset-password`, { email, code, newPassword });
    return resp.data;
  } catch (err) {
    console.error("Reset password error", err);
    throw err;
  }
};

export const logout = async () => {
  try {
    // Gọi API logout để backend xóa session/token nếu cần
    const resp = await api.post(`${BASE}/logout`);
    return resp.data;
  } catch (err) {
    console.error("Logout error", err);
    // Logout vẫn thành công ngay cả khi API fail
    throw err;
  }
};

export default {
  login,
  register,
  getCurrentUser,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
};