import React, { useState } from "react";
import useAuth from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "../../observability/faro";

const LoginForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Giả lập xác thực (sẽ thay bằng API thật ở tuần 2)
    if (form.username === "admin" && form.password === "123456") {
      login("fake-jwt-token", { username: form.username });
      trackEvent("auth_login_success", { method: "local" });
      navigate("/");
    } else {
      setError("Sai tài khoản hoặc mật khẩu");
      trackEvent("auth_login_failed", { method: "local" });
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
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>Mật khẩu</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        {error && (
          <p style={{ color: "red", textAlign: "center", marginBottom: "8px" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Đăng nhập
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
