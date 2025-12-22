import React, { useState } from "react";
import useAuth from "../../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import authService from "../../services/auth.service";

const styles = {
  container: {
    width: "100%",
    maxWidth: "400px",
    margin: "60px auto",
    padding: "30px",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    backgroundColor: "#fff",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  title: {
    textAlign: "center",
    fontSize: "24px",
    fontWeight: "600",
    marginBottom: "30px",
    color: "#333",
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  formGroup: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    marginBottom: "6px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#333",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    boxSizing: "border-box",
    fontFamily: "inherit",
    transition: "border-color 0.2s",
  },
  inputFocus: {
    outline: "none",
    borderColor: "#1976d2",
  },
  error: {
    color: "#d32f2f",
    fontSize: "13px",
    marginTop: "4px",
    padding: "8px",
    backgroundColor: "#ffebee",
    borderRadius: "4px",
    border: "1px solid #ef5350",
  },
  success: {
    color: "#388e3c",
    fontSize: "13px",
    marginTop: "4px",
    padding: "8px",
    backgroundColor: "#e8f5e9",
    borderRadius: "4px",
    border: "1px solid #4caf50",
  },
  button: {
    padding: "12px",
    fontSize: "16px",
    fontWeight: "600",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.3s",
    backgroundColor: "#1976d2",
    color: "#fff",
  },
  buttonDisabled: {
    backgroundColor: "#90caf9",
    cursor: "not-allowed",
  },
  linksContainer: {
    marginTop: "16px",
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
  },
  link: {
    color: "#1976d2",
    textDecoration: "none",
    cursor: "pointer",
    transition: "color 0.2s",
  },
  linkHover: {
    color: "#1565c0",
  },
  registerLink: {
    textAlign: "center",
    marginTop: "20px",
    fontSize: "14px",
    color: "#666",
  },
};

const LoginForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Basic validation
    if (!form.username.trim() || !form.password.trim()) {
      setError("Tên đăng nhập và mật khẩu không được để trống");
      setLoading(false);
      return;
    }

    try {
      const data = await authService.login(form.username, form.password);

      if (data.token && data.user) {
        setSuccess("Đăng nhập thành công! Đang chuyển hướng...");
        login(data.token, data.user);

        // Redirect after showing success message
        setTimeout(() => {
          navigate("/");
        }, 500);
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Đăng nhập thất bại. Vui lòng thử lại.";
      setError(errorMsg);
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Đăng nhập</h2>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Username Input */}
        <div style={styles.formGroup}>
          <label htmlFor="username" style={styles.label}>
            Tên đăng nhập
          </label>
          <input
            id="username"
            name="username"
            type="text"
            value={form.username}
            onChange={handleChange}
            disabled={loading}
            style={{
              ...styles.input,
              opacity: loading ? 0.6 : 1,
            }}
            placeholder="Nhập tên đăng nhập"
            required
            autoFocus
          />
        </div>

        {/* Password Input */}
        <div style={styles.formGroup}>
          <label htmlFor="password" style={styles.label}>
            Mật khẩu
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            disabled={loading}
            style={{
              ...styles.input,
              opacity: loading ? 0.6 : 1,
            }}
            placeholder="Nhập mật khẩu"
            required
          />
        </div>

        {/* Error Message */}
        {error && <div style={styles.error}>{error}</div>}

        {/* Success Message */}
        {success && <div style={styles.success}>{success}</div>}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            ...styles.button,
            ...(loading ? styles.buttonDisabled : {}),
          }}
        >
          {loading ? "Đang xử lý..." : "Đăng nhập"}
        </button>
      </form>

      {/* Links */}
      <div style={styles.linksContainer}>
        <Link
          to="/forgot-password"
          style={styles.link}
          onMouseEnter={(e) => (e.target.style.color = styles.linkHover.color)}
          onMouseLeave={(e) => (e.target.style.color = styles.link.color)}
        >
          Quên mật khẩu?
        </Link>
        <Link
          to="/register"
          style={styles.link}
          onMouseEnter={(e) => (e.target.style.color = styles.linkHover.color)}
          onMouseLeave={(e) => (e.target.style.color = styles.link.color)}
        >
          Đăng ký
        </Link>
      </div>
    </div>
  );
};

export default LoginForm;