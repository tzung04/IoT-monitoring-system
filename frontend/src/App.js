// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import DashboardPage from "./pages/DashboardPage";
import DeviceManagementPage from "./pages/DeviceManagementPage";
import DeviceDetailPage from "./pages/DeviceDetailPage";
import AlertManagementPage from "./pages/AlertManagementPage";
import ReportPage from "./pages/ReportPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import MainLayout from "./components/Layout/MainLayout";
import ErrorBoundary from "./components/Common/ErrorBoundary";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected Auth Route */}
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <MainLayout />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="devices" element={<DeviceManagementPage />} />
          <Route path="devices/:id" element={<DeviceDetailPage />} />
          <Route path="alerts" element={<AlertManagementPage />} />
          <Route path="reports" element={<ReportPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;
