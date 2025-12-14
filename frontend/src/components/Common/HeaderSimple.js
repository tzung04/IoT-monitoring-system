import React from "react";
import useAuth from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

const HeaderSimple = () => {
  const auth = useAuth();
  const user = auth?.user;
  const navigate = useNavigate();

  const handleLogout = () => {
    if (auth?.logout) auth.logout();
    navigate("/login");
  };

  return (
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "#1976d2", color: "#fff" }}>
      <div style={{ fontWeight: 600 }}>IoT Monitoring</div>
      <div>
        <span style={{ marginRight: 12 }}>{user?.username || "Guest"}</span>
        <button onClick={handleLogout} style={{ padding: "6px 10px", cursor: "pointer" }}>
          Logout
        </button>
      </div>
    </header>
  );
};

export default HeaderSimple;
