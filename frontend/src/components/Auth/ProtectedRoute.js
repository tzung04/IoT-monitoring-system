// src/components/Auth/ProtectedRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import { TOKEN_KEY } from "../../utils/constants";

const ProtectedRoute = ({ children }) => {
  // Avoid calling hooks here to prevent runtime errors if React context is
  // unavailable; check localStorage as the single source of truth for auth
  // persistence.
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;