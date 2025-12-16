import React, { createContext, useState, useEffect } from "react";
import { TOKEN_KEY } from "../utils/constants";
import authService from "../services/auth.service";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true); // Thêm trạng thái loading để tránh flash UI

  // Giữ trạng thái đăng nhập khi reload trang
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (savedToken) {
        setToken(savedToken);
        try {
          // Gọi API lấy thông tin user thực tế từ token
          const userData = await authService.getCurrentUser();
          setUser(userData);
        } catch (err) {
          // Nếu token hết hạn hoặc lỗi, đăng xuất
          console.error("Token invalid or expired", err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = (tokenValue, userData) => {
    localStorage.setItem(TOKEN_KEY, tokenValue);
    setToken(tokenValue);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};