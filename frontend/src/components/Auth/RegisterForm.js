import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { trackEvent } from "../../observability/faro";
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
  loginLink: {
    textAlign: "center",
    marginTop: "20px",
    fontSize: "14px",
    color: "#666",
  },
  link: {
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

const RegisterForm = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
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

    // Username validation
    if (!form.username.trim()) {
      newErrors.username = "Tên đăng nhập không được để trống";
    } else if (form.username.length < 3) {
      newErrors.username = "Tên đăng nhập phải có ít nhất 3 ký tự";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(form.username)) {
      newErrors.username =
        "Tên đăng nhập chỉ chứa chữ, số, dấu gạch dưới và gạch ngang";
    }

    // Email validation
    if (!form.email.trim()) {
      newErrors.email = "Email không được để trống";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Email không hợp lệ";
    }

    // Password validation
    if (!form.password) {
      newErrors.password = "Mật khẩu không được để trống";
    } else if (form.password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }

    // Confirm password validation
    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu";
    } else if (form.password !== form.confirmPassword) {
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
      const data = await authService.register(
        form.username,
        form.email,
        form.password
      );

      if (data.user) {
        setSuccess("Đăng ký thành công! Đang chuyển hướng đến trang đăng nhập...");
        trackEvent("auth_register_success", {
          username: form.username,
        });

        // Redirect to login after showing success message
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        "Đăng ký thất bại. Vui lòng thử lại.";
      setGeneralError(errorMsg);
      trackEvent("auth_register_failed", {
        error: errorMsg,
      });
      console.error("Register error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Đăng ký tài khoản</h2>

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
              borderColor: errors.username ? "#ef5350" : "#ddd",
            }}
            placeholder="Chỉ chứa chữ, số, dấu gạch"
            autoFocus
          />
          {errors.username && (
            <div style={styles.fieldError}>{errors.username}</div>
          )}
        </div>

        {/* Email Input */}
        <div style={styles.formGroup}>
          <label htmlFor="email" style={styles.label}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            disabled={loading}
            style={{
              ...styles.input,
              opacity: loading ? 0.6 : 1,
              borderColor: errors.email ? "#ef5350" : "#ddd",
            }}
            placeholder="your@email.com"
          />
          {errors.email && <div style={styles.fieldError}>{errors.email}</div>}
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
              borderColor: errors.password ? "#ef5350" : "#ddd",
            }}
            placeholder="Ít nhất 6 ký tự"
          />
          {errors.password && (
            <div style={styles.fieldError}>{errors.password}</div>
          )}
        </div>

        {/* Confirm Password Input */}
        <div style={styles.formGroup}>
          <label htmlFor="confirmPassword" style={styles.label}>
            Xác nhận mật khẩu
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
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
          {loading ? "Đang xử lý..." : "Đăng ký"}
        </button>
      </form>

      {/* Login Link */}
      <div style={styles.loginLink}>
        Đã có tài khoản?{" "}
        <Link
          to="/login"
          style={styles.link}
          onMouseEnter={(e) => (e.target.style.color = styles.linkHover.color)}
          onMouseLeave={(e) => (e.target.style.color = styles.link.color)}
        >
          Đăng nhập
        </Link>
      </div>
    </div>
  );
};

export default RegisterForm;
