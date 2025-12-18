import React from "react";
import { Navigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    // Show loading state while checking authentication
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#f5f5f5",
      }}>
        <div style={{
          textAlign: "center",
        }}>
          <div style={{
            fontSize: "18px",
            color: "#666",
            marginBottom: "16px",
          }}>
            Đang kiểm tra phiên đăng nhập...
          </div>
        </div>
      </div>
    );
  }

  // If no token, redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Token exists, render children
  return children;
};

export default ProtectedRoute;