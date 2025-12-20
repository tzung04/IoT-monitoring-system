import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  TextField,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Container,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import authService from "../services/auth.service";
import HeaderSimple from "../components/Common/HeaderSimple";
import FooterSimple from "../components/Common/FooterSimple";

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!form.currentPassword) {
      setToast({ open: true, message: "Vui lòng nhập mật khẩu hiện tại", severity: "error" });
      return;
    }

    if (!form.newPassword) {
      setToast({ open: true, message: "Vui lòng nhập mật khẩu mới", severity: "error" });
      return;
    }

    if (form.newPassword.length < 6) {
      setToast({ open: true, message: "Mật khẩu mới phải có ít nhất 6 ký tự", severity: "error" });
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setToast({ open: true, message: "Mật khẩu xác nhận không khớp", severity: "error" });
      return;
    }

    try {
      setLoading(true);
      await authService.changePassword(form.currentPassword, form.newPassword);
      setToast({ open: true, message: "Đã thay đổi mật khẩu thành công. Vui lòng đăng nhập lại.", severity: "success" });
      
      // Sau 2 giây, đăng xuất và chuyển về trang login
      setTimeout(() => {
        logout();
        navigate("/login");
      }, 2000);
    } catch (err) {
      console.error("Change password error", err);
      setToast({ 
        open: true, 
        message: err.response?.data?.message || "Thay đổi mật khẩu thất bại. Vui lòng kiểm tra mật khẩu hiện tại.", 
        severity: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <HeaderSimple />
      
      <Container maxWidth="sm" sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", py: 4 }}>
        <Card sx={{ width: "100%" }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              Thay đổi mật khẩu
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              {user?.username && `Tài khoản: ${user.username}`}
            </Typography>

            <Stack component="form" spacing={2} onSubmit={handleSubmit}>
              <TextField
                label="Mật khẩu hiện tại"
                name="currentPassword"
                type="password"
                value={form.currentPassword}
                onChange={handleChange}
                fullWidth
                size="small"
                disabled={loading}
              />

              <TextField
                label="Mật khẩu mới"
                name="newPassword"
                type="password"
                value={form.newPassword}
                onChange={handleChange}
                fullWidth
                size="small"
                disabled={loading}
                helperText="Tối thiểu 6 ký tự"
              />

              <TextField
                label="Xác nhận mật khẩu mới"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                fullWidth
                size="small"
                disabled={loading}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : "Thay đổi mật khẩu"}
              </Button>

              <Button
                variant="outlined"
                fullWidth
                onClick={() => navigate(-1)}
                disabled={loading}
              >
                Quay lại
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert 
          severity={toast.severity} 
          onClose={() => setToast({ ...toast, open: false })} 
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>

      <FooterSimple />
    </Box>
  );
};

export default ChangePasswordPage;
