import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
    marginBottom: "12px",
    color: "#333",
  },
  subtitle: {
    textAlign: "center",
    fontSize: "13px",
    color: "#666",
    marginBottom: "24px",
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
  fieldError: {
    color: "#d32f2f",
    fontSize: "12px",
    marginTop: "2px",
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
  link: {
    textAlign: "center",
    marginTop: "16px",
    fontSize: "13px",
  },
  linkElement: {
    color: "#1976d2",
    textDecoration: "none",
    cursor: "pointer",
    fontWeight: "600",
    transition: "color 0.2s",
  },
  linkHover: {
    color: "#1565c0",
  },
};

const ForgotPasswordForm = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (error) setError("");
    if (success) setSuccess("");
  };

  const validateEmail = (value) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Email không được để trống");
      return;
    }

    if (!validateEmail(email)) {
      setError("Email không hợp lệ");
      return;
    }

    setLoading(true);

    try {
      const data = await authService.forgotPassword(email);

      setSuccess(
        "Email với mã reset đã được gửi. Vui lòng kiểm tra hộp thư của bạn. Chuyển hướng trong 5 giây..."
      );

      // Redirect to reset password page after showing success
      setTimeout(() => {
        navigate("/reset-password");
      }, 5000);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        "Không thể gửi email. Vui lòng thử lại.";
      setError(errorMsg);
      console.error("Forgot password error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Quên mật khẩu?</h2>
      <p style={styles.subtitle}>
        Nhập email của bạn để nhận mã reset mật khẩu
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Email Input */}
        <div style={styles.formGroup}>
          <label htmlFor="email" style={styles.label}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={handleChange}
            disabled={loading}
            style={{
              ...styles.input,
              opacity: loading ? 0.6 : 1,
            }}
            placeholder="your@email.com"
            autoFocus
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
          {loading ? "Đang gửi..." : "Gửi mã reset"}
        </button>
      </form>

      {/* Links */}
      <div style={styles.link}>
        <Link
          to="/login"
          style={styles.linkElement}
          onMouseEnter={(e) =>
            (e.target.style.color = styles.linkHover.color)
          }
          onMouseLeave={(e) => (e.target.style.color = styles.linkElement.color)}
        >
          Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
