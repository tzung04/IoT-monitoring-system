import React, { useState } from "react";
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

const ResetPasswordForm = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    code: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (generalError) setGeneralError("");
    if (success) setSuccess("");
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!form.email.trim()) {
      newErrors.email = "Email không được để trống";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Email không hợp lệ";
    }

    // Code validation
    if (!form.code.trim()) {
      newErrors.code = "Mã reset không được để trống";
    } else if (form.code.length < 4) {
      newErrors.code = "Mã reset không hợp lệ";
    }

    // Password validation
    if (!form.newPassword) {
      newErrors.newPassword = "Mật khẩu mới không được để trống";
    } else if (form.newPassword.length < 6) {
      newErrors.newPassword = "Mật khẩu phải có ít nhất 6 ký tự";
    }

    // Confirm password validation
    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu";
    } else if (form.newPassword !== form.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu không khớp";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError("");
    setSuccess("");

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const data = await authService.resetPassword(
        form.email,
        form.code,
        form.newPassword
      );

      setSuccess(
        "Mật khẩu đã được reset thành công! Đang chuyển hướng đến trang đăng nhập..."
      );

      // Redirect to login after showing success
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        "Reset mật khẩu thất bại. Vui lòng thử lại.";
      setGeneralError(errorMsg);
      console.error("Reset password error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Reset mật khẩu</h2>
      <p style={styles.subtitle}>
        Nhập email, mã reset và mật khẩu mới
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
            name="email"
            value={form.email}
            onChange={handleChange}
            disabled={loading}
            style={{
              ...styles.input,
              opacity: loading ? 0.6 : 1,
              borderColor: errors.email ? "#ef5350" : "#ddd",
            }}
            placeholder="your@email.com"
            autoFocus
          />
          {errors.email && (
            <div style={styles.fieldError}>{errors.email}</div>
          )}
        </div>

        {/* Reset Code Input */}
        <div style={styles.formGroup}>
          <label htmlFor="code" style={styles.label}>
            Mã reset (từ email)
          </label>
          <input
            id="code"
            type="text"
            name="code"
            value={form.code}
            onChange={handleChange}
            disabled={loading}
            style={{
              ...styles.input,
              opacity: loading ? 0.6 : 1,
              borderColor: errors.code ? "#ef5350" : "#ddd",
            }}
            placeholder="Nhập mã 6 ký tự"
            maxLength="10"
          />
          {errors.code && (
            <div style={styles.fieldError}>{errors.code}</div>
          )}
        </div>

        {/* New Password Input */}
        <div style={styles.formGroup}>
          <label htmlFor="newPassword" style={styles.label}>
            Mật khẩu mới
          </label>
          <input
            id="newPassword"
            type="password"
            name="newPassword"
            value={form.newPassword}
            onChange={handleChange}
            disabled={loading}
            style={{
              ...styles.input,
              opacity: loading ? 0.6 : 1,
              borderColor: errors.newPassword ? "#ef5350" : "#ddd",
            }}
            placeholder="Ít nhất 6 ký tự"
          />
          {errors.newPassword && (
            <div style={styles.fieldError}>{errors.newPassword}</div>
          )}
        </div>

        {/* Confirm Password Input */}
        <div style={styles.formGroup}>
          <label htmlFor="confirmPassword" style={styles.label}>
            Xác nhận mật khẩu
          </label>
          <input
            id="confirmPassword"
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            disabled={loading}
            style={{
              ...styles.input,
              opacity: loading ? 0.6 : 1,
              borderColor: errors.confirmPassword ? "#ef5350" : "#ddd",
            }}
            placeholder="Nhập lại mật khẩu"
          />
          {errors.confirmPassword && (
            <div style={styles.fieldError}>{errors.confirmPassword}</div>
          )}
        </div>

        {/* General Error Message */}
        {generalError && <div style={styles.error}>{generalError}</div>}

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
          {loading ? "Đang xử lý..." : "Reset mật khẩu"}
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

export default ResetPasswordForm;
