import React, { useState } from "react";
import useAuth from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "../../observability/faro";
import authService from "../../services/auth.service"; // Import service

const LoginForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // UI loading state

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Xóa lỗi khi người dùng nhập lại
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Gọi API thực tế
      const data = await authService.login(form.username, form.password);
      
      // Backend trả về { user, token }
      if (data.token && data.user) {
        login(data.token, data.user);
        trackEvent("auth_login_success", { method: "api" });
        navigate("/");
      }
    } catch (err) {
      // Xử lý lỗi từ backend trả về (thường là err.response.data.message)
      const msg = err.response?.data?.message || "Đăng nhập thất bại. Vui lòng thử lại.";
      setError(msg);
      trackEvent("auth_login_failed", { method: "api", error: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: "320px",
        margin: "120px auto",
        padding: "20px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        background: "#fff",
      }}
    >
      <h2 style={{ textAlign: "center" }}>Đăng nhập</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "10px" }}>
          <label>Tên đăng nhập</label>
          <input
            name="username"
            type="text"
            value={form.username}
            onChange={handleChange}
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
            required
            disabled={loading}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>Mật khẩu</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
            required
            disabled={loading}
          />
        </div>

        {error && (
          <p style={{ color: "red", textAlign: "center", marginBottom: "8px", fontSize: "14px" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: loading ? "#90caf9" : "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Đang xử lý..." : "Đăng nhập"}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;